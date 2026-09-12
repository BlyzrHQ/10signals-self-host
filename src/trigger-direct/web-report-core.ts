import { PermanentOrchestrationError } from "../shared/report-orchestration-contract.ts";
import { parseWebDirectReportPayload, sameReportResearchOptions, webDirectRequest, type ReportResearchOptions, type WebDirectReportPayload } from "../shared/web-direct-report-contract.ts";
import { orchestrateValidatedReport, type StoredReport } from "../trigger/report-orchestration-core.ts";
import { createWebWorkflowPort, type WebsitePersistencePort } from "./web-port.ts";
import type { WorkflowIdentity, WorkflowStore } from "./workflow-state.ts";
import type { createWorkflowPort } from "./workflow-port.ts";

export function assertWebReportIntent(payload: WebDirectReportPayload, stored: StoredReport | null): asserts stored is StoredReport {
  const run = stored?.run as (StoredReport["run"] & { researchOptions?: ReportResearchOptions }) | undefined;
  if (!run || run.publicId !== payload.publicId || run.primaryDomain !== payload.primaryDomain || run.locale !== payload.locale
    || run.attemptCount !== payload.reportAttempt || run.productPlan !== payload.productPlan || run.productLimit !== payload.productLimit
    || !sameReportResearchOptions(run.researchOptions, payload.researchOptions)) throw new PermanentOrchestrationError("WEB_REPORT_INTENT_CONFLICT: no research was started.");
}

export async function runWebDirectReport(input: unknown, deps: {
  website: WebsitePersistencePort;
  openStore: (request: ReturnType<typeof webDirectRequest>, identity: WorkflowIdentity) => Promise<WorkflowStore>;
  taskAttempt: number;
  maxAttempts: number;
  researchOverrides?: Parameters<typeof createWorkflowPort>[1];
}) {
  const payload = parseWebDirectReportPayload(input);
  await deps.website.preflight();
  const stored = await deps.website.loadReport(payload.publicId);
  assertWebReportIntent(payload, stored);
  if (["complete", "limited", "failed", "interrupted"].includes(stored.run.status)) return { ok: true, publicId: payload.publicId, reportStatus: stored.run.status, replayed: true };
  const identity: WorkflowIdentity = { publicId: payload.publicId, primaryDomain: payload.primaryDomain,
    locale: payload.locale, attemptCount: payload.reportAttempt, productPlan: payload.productPlan,
    productLimit: payload.productLimit, createdAt: stored.run.createdAt };
  let store: WorkflowStore | undefined;
  try {
    // A new attempt cannot silently replace an older attempt's completed facts.
    if (stored.factManifest && stored.factManifest.attemptNumber !== payload.reportAttempt) throw new PermanentOrchestrationError("PRIOR_FACTS_REQUIRE_REVIEW: no replacement research started.");
    store = await deps.openStore(webDirectRequest(payload), identity);
    const port = createWebWorkflowPort(store, deps.website, deps.researchOverrides);
    const result = await orchestrateValidatedReport({ contractVersion: "6", publicId: payload.publicId,
      primaryDomain: payload.primaryDomain, locale: payload.locale, reportAttempt: payload.reportAttempt,
      productPlan: payload.productPlan, productLimit: payload.productLimit },
      { attemptNumber: payload.reportAttempt, taskAttemptNumber: deps.taskAttempt, isFinalAttempt: deps.taskAttempt >= deps.maxAttempts }, port);
    const saved = await deps.website.loadReport(payload.publicId);
    assertWebReportIntent(payload, saved);
    if (!["complete", "limited"].includes(saved.run.status)) throw new Error("WEBSITE_PUBLICATION_UNCONFIRMED");
    return { ...result, engine: "direct-trigger" as const };
  } catch (error) {
    let uncertain = false;
    try { store?.assertHealthy(); } catch { uncertain = true; }
    const permanent = uncertain || error instanceof PermanentOrchestrationError || (error instanceof Error && error.name === "AbortTaskRunError");
    if (permanent || deps.taskAttempt >= deps.maxAttempts) {
      try {
        const current = await deps.website.loadReport(payload.publicId);
        assertWebReportIntent(payload, current);
        if (["complete", "limited"].includes(current.run.status)) return { ok: true, publicId: payload.publicId, reportStatus: current.run.status, replayed: true };
        if (!["failed", "interrupted"].includes(current.run.status)) await deps.website.appendEvent(payload.publicId, {
          attemptNumber: payload.reportAttempt, idempotencyKey: `web-direct-terminal-${payload.reportAttempt}`, phase: "failed", status: "failed",
          message: uncertain ? "Research stopped because a saved operation could not be confirmed. No automatic replacement was launched." : "The research task could not complete a verified report. No unverified results were published.",
          metadata: { engine: "direct-trigger", diagnosticCode: uncertain ? "research-outcome-unknown" : "direct-report-failed" },
        });
      } catch { /* Never repeat paid work just to report an unavailable callback. */ }
    }
    if (uncertain) throw new PermanentOrchestrationError("DURABLE_RESEARCH_OUTCOME_UNKNOWN");
    throw error;
  }
}
