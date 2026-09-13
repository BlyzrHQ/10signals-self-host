import { spawn } from "node:child_process";
import { localHttpOrigin } from "../app/lib/local-http.ts";

if (!localHttpOrigin() || (process.env.BETTER_AUTH_SECRET || "").length < 32) {
  console.error("Local setup is incomplete. Run docker compose run --rm setup first. HTTP requires a localhost origin; use the HTTPS deployment for a server.");
  process.exit(1);
}
console.info("10Signals local-only HTTP preview. Keep the gateway published on 127.0.0.1; do not expose this installation to your network.");
const child = spawn(process.execPath, ["node_modules/vinext/dist/cli.js", "start", "--host", "0.0.0.0"], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("error", () => { console.error("Could not start 10Signals."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
