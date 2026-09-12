import { createWorkflowPort } from "./workflow-port.ts";
import type { WorkflowStore } from "./workflow-state.ts";
import type { ReportOrchestrationPort } from "../trigger/report-orchestration-core.ts";

export type WebsitePersistencePort = Pick<ReportOrchestrationPort, "preflight" | "loadReport" | "appendEvent" | "persistFactChunk" | "finalizeFactManifest" | "saveDocument">;

/** Shared CLI research + website-owned facts. No HTTP research methods escape. */
export function createWebWorkflowPort(store: WorkflowStore, website: WebsitePersistencePort, overrides?: Parameters<typeof createWorkflowPort>[1]): ReportOrchestrationPort {
  const direct = createWorkflowPort(store, overrides);
  return { ...direct,
    preflight: async () => { await website.preflight(); await direct.preflight(); },
    loadReport: website.loadReport,
    appendEvent: website.appendEvent,
    persistFactChunk: website.persistFactChunk,
    finalizeFactManifest: website.finalizeFactManifest,
    saveDocument: website.saveDocument,
  };
}
