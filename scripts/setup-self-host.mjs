import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

export function selfHostEnvironment({ providerKey = "", port = 8443 } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error("Choose a port from 1024 to 65535.");
  if (/[\r\n\0']/.test(providerKey)) throw Error("Invalid provider key.");
  return `# Private instance configuration. Never commit or share this file.
MARKET_SIGNAL_MODE=self-hosted
MARKET_SIGNAL_DEPLOY_TARGET=node
MARKET_SIGNAL_EXECUTION_BACKEND=local
MARKET_SIGNAL_HOSTED_BILLING=false
MARKET_SIGNAL_SQLITE_PATH=/data/10signals.sqlite
BETTER_AUTH_URL=https://localhost:${port}
BETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}
# Loopback-only candidate; disable signup before exposing to other people.
MARKET_SIGNAL_SELF_HOST_ALLOW_SIGNUP=true
SELF_HOST_HOSTNAME=localhost
SELF_HOST_HTTPS_PORT=${port}
OPENAI_API_KEY='${providerKey}'
`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("node scripts/setup-self-host.mjs [--without-provider] [--port 8443]\nCreates .env.self-host without overwriting it. Loopback HTTPS candidate, no company connection."); return;
  }
  if (args.some((a, i) => !["--without-provider", "--port"].includes(a) && args[i - 1] !== "--port")) throw Error("Unknown argument. Use --help.");
  const port = args.includes("--port") ? Number(args[args.indexOf("--port") + 1]) : 8443;
  let providerKey = "";
  if (!args.includes("--without-provider")) {
    if (!process.stdin.isTTY) throw Error("Use an interactive terminal for the hidden provider prompt, or --without-provider for setup-only testing.");
    let muted = false;
    const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
    const rl = createInterface({ input: process.stdin, output, terminal: true });
    process.stdout.write("Your own OpenAI provider key (hidden; blank skips research): ");
    muted = true;
    try { providerKey = (await rl.question("")).trim(); } finally { muted = false; rl.close(); process.stdout.write("\n"); }
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  await writeFile(resolve(root, ".env.self-host"), selfHostEnvironment({ providerKey, port }), { flag: "wx", mode: 0o600 });
  console.log("Created private .env.self-host. No key was printed; existing files are never replaced.");
  console.log(`Next: docker compose --env-file .env.self-host -f compose.self-host.yaml${providerKey ? " --profile research" : ""} up --build -d`);
  console.log(`10Signals: https://localhost:${port} (trust only this instance's local development CA; see docs/self-hosting.md).`);
  if (!providerKey) console.log("Research is disabled until you supply your own provider key and start the research profile.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.code === "EEXIST" ? ".env.self-host already exists; inspect it instead of overwriting your installation." : error.message); process.exitCode = 1; });
