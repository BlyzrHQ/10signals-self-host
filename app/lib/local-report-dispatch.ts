import { LocalReportQueue } from "../../src/local/report-queue.ts";
import { parseWebDirectReportPayload } from "../../src/shared/web-direct-report-contract.ts";
import type { DispatchableReport } from "./report-dispatch.ts";
import { accountProviderEnabled, LocalProviderStore, providerDatabasePath, type ProviderOwner } from "./local-provider-store.ts";

export function localQueuePath(environment: Record<string, string | undefined> = process.env) {
  const path = environment.MARKET_SIGNAL_SQLITE_PATH?.trim();
  if (!path) throw new Error("LOCAL_DATABASE_NOT_CONFIGURED");
  return `${path}.queue.sqlite`;
}
export function localResearchStatus(environment: Record<string, string | undefined> = process.env) {
  try {
    const queue = new LocalReportQueue(localQueuePath(environment));
    try { return queue.workerStatus(); } finally { queue.close(); }
  } catch { return "unavailable" as const; }
}
export function localResearchSetupMessage(status: "ready" | "disabled" | "unavailable") {
  if (status === "ready") return null;
  return status === "disabled"
    ? "Research is disabled. In your installation folder, run docker compose run --rm setup --set-key, then docker compose up -d --wait. No report was created."
    : "The local research worker is unavailable. In your installation folder, run docker compose up -d --wait and check docker compose logs worker. No report was created.";
}
export function accountResearchSetupMessage(owner: ProviderOwner | undefined, environment: Record<string, string | undefined> = process.env) {
  if (localResearchStatus(environment) !== "ready") return "The local research worker is unavailable. Start it with docker compose up -d --wait. No report was created.";
  if (!owner) return "Sign in and add your OpenAI key in Account → AI provider. No report was created.";
  const store = new LocalProviderStore(providerDatabasePath(environment));
  try {
    return store.vault() && store.summary(owner).configured ? null : "Add your OpenAI key in Account → AI provider, then run the report again. No report was created.";
  } finally { store.close(); }
}
export function enqueueLocalReport(report: DispatchableReport) {
  const payload = parseWebDirectReportPayload({ contractVersion: "1", publicId: report.publicId,
    primaryDomain: report.primaryDomain, locale: report.locale, reportAttempt: report.attemptCount,
    productPlan: report.productPlan || "starter", productLimit: report.productLimit || 20,
    researchOptions: report.researchOptions });
  const queue = new LocalReportQueue(localQueuePath());
  try {
    if (!accountProviderEnabled() && queue.workerStatus() === "disabled") throw new Error("LOCAL_PROVIDER_NOT_CONFIGURED");
    if (!queue.workerReady()) throw new Error("LOCAL_WORKER_NOT_READY");
    return { runId: queue.enqueue(payload), idempotencyKey: `${report.publicId}:local-v1:${report.attemptCount}` };
  }
  finally { queue.close(); }
}
