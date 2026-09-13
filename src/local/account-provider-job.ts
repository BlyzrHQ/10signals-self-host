import { spawn } from "node:child_process";
import { LocalProviderStore, providerDatabasePath } from "../../app/lib/local-provider-store.ts";
import { getStoredReport } from "../../app/lib/report-store.ts";
import { LocalReportQueue, type LocalJob } from "./report-queue.ts";

// Match market-signal-web-direct-report's execution ceiling, not expected latency.
export const LOCAL_PROVIDER_JOB_MAX_MS = 14_700 * 1000;

export function isolatedProviderEnvironment(parent: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...parent };
  for (const key of ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "MARKET_SIGNAL_DISCOVERY_MODEL", "MARKET_SIGNAL_MATCH_MODEL", "MARKET_SIGNAL_ACTION_MODEL", "MARKET_SIGNAL_MATCH_EMBEDDING_MODEL"]) delete env[key];
  env.OPENAI_RESPONSES_BASE_URL = "https://api.openai.com/v1";
  return env;
}

const launchProviderChild = () => spawn(process.execPath, ["--experimental-strip-types", "scripts/local-report-child.ts"], {
  env: isolatedProviderEnvironment(process.env), stdio: ["pipe", "ignore", "ignore"], windowsHide: true,
});
type AccountJobServices = { lookupReport: typeof getStoredReport; openStore: () => LocalProviderStore; launch: typeof launchProviderChild };
export async function executeAccountProviderJob(queue: LocalReportQueue, job: LocalJob, privateKey: string, services: AccountJobServices = {
  lookupReport: getStoredReport, openStore: () => new LocalProviderStore(providerDatabasePath()), launch: launchProviderChild,
}) {
  let handedOff = false;
  try {
    queue.assertLease(job);
    const report = await services.lookupReport(job.payload.publicId);
    if (!report?.run.workspaceId || report.run.attemptCount !== job.payload.reportAttempt) throw Error("PROVIDER_OWNER_UNAVAILABLE");
    const store = services.openStore();
    let apiKey: string;
    try { apiKey = store.decryptForWorkspace(report.run.workspaceId, privateKey).apiKey; }
    finally { store.close(); }
    await new Promise<void>((resolve, reject) => {
      const child = services.launch();
      child.once("spawn", () => { handedOff = true; });
      // No provider value in argv, environment, queue, logs or durable results.
      const timer = setTimeout(() => { child.kill("SIGKILL"); }, LOCAL_PROVIDER_JOB_MAX_MS);
      const stop = () => { child.kill("SIGTERM"); };
      process.on("SIGTERM", stop);
      process.on("SIGINT", stop);
      const clean = () => { clearTimeout(timer); process.off("SIGTERM", stop); process.off("SIGINT", stop); child.stdin.destroy(); };
      child.on("error", () => { clean(); reject(Error("LOCAL_PROVIDER_PROCESS_FAILED")); });
      child.on("exit", code => { clean(); if (code === 0) resolve(); else reject(Error("LOCAL_PROVIDER_PROCESS_FAILED")); });
      child.stdin.on("error", () => { /* Exit/error handlers produce a sanitized failure. */ });
      // Keep the pipe open as a liveness signal. EOF stops an orphaned child.
      child.stdin.write(JSON.stringify({ job, apiKey }) + "\n");
      apiKey = "";
    });
  } catch {
    // Once spawned, only the child owns lease renewal and completion. A crash
    // expires as interrupted; the parent must not race a still-running child.
    if (!handedOff) try { queue.finish(job, "failed", "account-provider-unavailable"); } catch { /* Do not reclaim or retry expired work. */ }
    throw Error("LOCAL_ACCOUNT_RESEARCH_FAILED");
  }
}
