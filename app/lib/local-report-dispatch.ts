import { LocalReportQueue } from "../../src/local/report-queue.ts";
import { parseWebDirectReportPayload } from "../../src/shared/web-direct-report-contract.ts";
import type { DispatchableReport } from "./report-dispatch.ts";

export function localQueuePath(environment: Record<string, string | undefined> = process.env) {
  const path = environment.MARKET_SIGNAL_SQLITE_PATH?.trim();
  if (!path) throw new Error("LOCAL_DATABASE_NOT_CONFIGURED");
  return `${path}.queue.sqlite`;
}
export function enqueueLocalReport(report: DispatchableReport) {
  const payload = parseWebDirectReportPayload({ contractVersion: "1", publicId: report.publicId,
    primaryDomain: report.primaryDomain, locale: report.locale, reportAttempt: report.attemptCount,
    productPlan: report.productPlan || "starter", productLimit: report.productLimit || 20,
    researchOptions: report.researchOptions });
  const queue = new LocalReportQueue(localQueuePath());
  try {
    if (!queue.workerReady()) throw new Error("LOCAL_WORKER_NOT_READY");
    return { runId: queue.enqueue(payload), idempotencyKey: `${report.publicId}:local-v1:${report.attemptCount}` };
  }
  finally { queue.close(); }
}
