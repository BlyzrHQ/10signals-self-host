import { LocalReportQueue, type LocalJob } from "./report-queue.ts";
import { runWebDirectReport } from "../trigger-direct/web-report-core.ts";
import { decodeState, encodeState, initialState, WorkflowStore } from "../trigger-direct/workflow-state.ts";
import { appendReportEvent, getStoredReport, saveReportFactChunk, finalizeReportFactManifest, saveReportDocument, type ReportPhase, type ReportRunStatus } from "../../app/lib/report-store.ts";
import type { WebsitePersistencePort } from "../trigger-direct/web-port.ts";

export function localWebsitePort(assertLease: () => void): WebsitePersistencePort {
  return {
    preflight: async () => { assertLease(); if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("LOCAL_PROVIDER_NOT_CONFIGURED"); },
    loadReport: async id => { assertLease(); return getStoredReport(id); },
    appendEvent: async (id, input) => { assertLease(); await appendReportEvent(id, { ...input, phase: input.phase as ReportPhase, status: input.status as ReportRunStatus }); },
    persistFactChunk: async (id, input) => { assertLease(); await saveReportFactChunk(id, input); },
    finalizeFactManifest: async (id, input) => { assertLease(); await finalizeReportFactManifest(id, input); },
    saveDocument: async (id, { document, ...input }) => { assertLease(); await saveReportDocument(id, document, input); },
  };
}

export async function executeLocalJob(queue: LocalReportQueue, job: LocalJob, options: {
  website?: WebsitePersistencePort;
  researchOverrides?: Parameters<typeof runWebDirectReport>[1]["researchOverrides"];
} = {}) {
  const heartbeat = setInterval(() => { try { queue.renew(job); } catch { /* Next guarded read/write stops work. */ } }, 10_000);
  try {
    const result = await runWebDirectReport(job.payload, {
      website: options.website || localWebsitePort(() => queue.assertLease(job)),
      taskAttempt: 1, maxAttempts: 1, researchOverrides: options.researchOverrides,
      openStore: async (request, identity) => {
        const packet = queue.loadPacket(job);
        const state = packet ? decodeState(packet, job.id, request, identity) : initialState(job.id, request, identity.createdAt, identity);
        if (!packet) queue.savePacket(job, encodeState(state));
        const store = new WorkflowStore(state, async next => queue.savePacket(job, next));
        const healthy = store.assertHealthy.bind(store);
        store.assertHealthy = () => { healthy(); queue.assertLease(job); };
        return store;
      },
    });
    queue.finish(job, "complete");
    return result;
  } catch (error) {
    try { queue.finish(job, "failed", "local-report-failed"); } catch { /* Never take ownership back or retry. */ }
    throw error;
  } finally { clearInterval(heartbeat); }
}

export async function recordInterruptedJob(job: { id: string; payload: LocalJob["payload"]; status?: string; error_code?: string }) {
  const report = await getStoredReport(job.payload.publicId);
  if (!report || ["complete", "limited", "failed", "interrupted"].includes(report.run.status)) return;
  if (report.run.attemptCount !== job.payload.reportAttempt) return;
  await appendReportEvent(job.payload.publicId, { attemptNumber: job.payload.reportAttempt,
    idempotencyKey: `local-interrupted-${job.id}`, phase: "failed", status: "failed",
    message: job.error_code === "provider-not-configured" ? "The provider key was removed before research started. Configure the local worker before requesting another report."
      : job.error_code === "dispatch-unconfirmed" ? "Dispatch could not be confirmed. No research was launched; ask your operator to inspect this run."
      : job.status === "failed" ? "The local research task failed. No automatic paid retry was launched; ask your operator to inspect this run."
      : "The local worker stopped unexpectedly. No automatic paid retry was launched; ask your operator to inspect this run.",
    errorCode: job.status === "failed" ? "local-report-failed" : "local-worker-interrupted" });
}

export async function maintainLocalQueue(queue: LocalReportQueue, researchEnabled: boolean, notify = recordInterruptedJob) {
  queue.interruptExpired();
  queue.expireUnconfirmed();
  if (!researchEnabled) queue.failQueuedWithoutProvider();
  for (const job of queue.unnotifiedTerminal()) {
    try { await notify(job); queue.markNotified(job.id); }
    catch { queue.deferNotification(job.id); console.error(JSON.stringify({ runId: job.id, errorCode: "terminal-notification-pending" })); }
  }
}

export async function confirmLocalDispatches(queue: LocalReportQueue, loadReport: typeof getStoredReport = getStoredReport) {
  for (const job of queue.awaitingConfirmation()) {
    const report = await loadReport(job.payload.publicId);
    if (report?.run.attemptCount === job.payload.reportAttempt && report.events.some(event =>
      event.idempotencyKey === `job-dispatched-attempt-${job.payload.reportAttempt}`
      && event.metadata && typeof event.metadata === "object" && "triggerRunId" in event.metadata && event.metadata.triggerRunId === job.id)) queue.confirm(job.id);
  }
}
