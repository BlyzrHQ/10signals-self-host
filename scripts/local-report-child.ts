import { localQueuePath } from "../app/lib/local-report-dispatch.ts";
import { accountProviderEnabled, validProviderKey } from "../app/lib/local-provider-store.ts";
import { LocalReportQueue, type LocalJob } from "../src/local/report-queue.ts";
import { executeLocalJob } from "../src/local/report-worker.ts";

async function main() {
  if (!accountProviderEnabled() || process.env.OPENAI_API_KEY || process.env.OPENAI_RESPONSES_BASE_URL !== "https://api.openai.com/v1") throw Error("INVALID_CHILD_ENVIRONMENT");
  const terminate = () => { process.exit(1); };
  process.on("SIGTERM", terminate);
  process.on("SIGINT", terminate);
  process.stdin.on("end", terminate);
  process.stdin.on("error", terminate);
  const input = await new Promise<{job: LocalJob; apiKey: string}>((resolve, reject) => {
    let body = "";
    const data = (chunk: Buffer) => {
      body += chunk.toString("utf8");
      if (Buffer.byteLength(body) > 16_384) { reject(Error("INVALID_CHILD_INPUT")); return; }
      if (!body.includes("\n")) return;
      process.stdin.off("data", data);
      try { resolve(JSON.parse(body)); } catch { reject(Error("INVALID_CHILD_INPUT")); }
      body = "";
    };
    process.stdin.on("data", data);
  });
  if (!validProviderKey(input.apiKey)) throw Error("INVALID_CHILD_INPUT");
  const queue = new LocalReportQueue(localQueuePath());
  try {
    queue.assertLease(input.job);
    // Process is dedicated to one report. No other user's code shares this env.
    process.env.OPENAI_API_KEY = input.apiKey;
    input.apiKey = "";
    await executeLocalJob(queue, input.job);
  } finally { delete process.env.OPENAI_API_KEY; queue.close(); }
}
main().then(() => process.exit(0), () => process.exit(1));
