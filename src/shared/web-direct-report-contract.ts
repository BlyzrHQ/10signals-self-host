import { parseReportOrchestrationPayload, PermanentOrchestrationError, type ReportOrchestrationPayload } from "./report-orchestration-contract.ts";

export type ReportResearchOptions = {
  engine: "direct-trigger";
  includeAnalysis: boolean;
  closePricePercent?: number;
};

/** Persist this server-selected engine in the report creation intent. */
export function parseReportResearchOptions(value: unknown): ReportResearchOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PermanentOrchestrationError("Invalid report research options.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["engine", "includeAnalysis", "closePricePercent"].includes(key))
    || input.engine !== "direct-trigger" || typeof input.includeAnalysis !== "boolean"
    || (input.closePricePercent !== undefined && (!Number.isInteger(input.closePricePercent) || Number(input.closePricePercent) < 1 || Number(input.closePricePercent) > 90))) {
    throw new PermanentOrchestrationError("Invalid report research options.");
  }
  return { engine: "direct-trigger", includeAnalysis: input.includeAnalysis,
    ...(input.closePricePercent !== undefined ? { closePricePercent: Number(input.closePricePercent) } : {}) };
}

export function sameReportResearchOptions(left: ReportResearchOptions | undefined, right: ReportResearchOptions | undefined) {
  return JSON.stringify(left ? parseReportResearchOptions(left) : null) === JSON.stringify(right ? parseReportResearchOptions(right) : null);
}

/** A legacy command replay retains its old engine; explicit new options conflict. */
export function compatibleCreationResearchOptions(existing: ReportResearchOptions | undefined, requested: ReportResearchOptions | undefined) {
  return sameReportResearchOptions(existing, requested)
    || (!existing && requested?.engine === "direct-trigger" && requested.includeAnalysis === false && requested.closePricePercent === undefined);
}

export type WebDirectReportPayload = Omit<ReportOrchestrationPayload, "contractVersion"> & {
  contractVersion: "1";
  researchOptions: ReportResearchOptions;
};

export function parseWebDirectReportPayload(value: unknown): WebDirectReportPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PermanentOrchestrationError("Invalid website report payload.");
  const { researchOptions, contractVersion, ...report } = value as Record<string, unknown>;
  if (contractVersion !== "1") throw new PermanentOrchestrationError("Unsupported website report contract.");
  const parsed = parseReportOrchestrationPayload({ ...report, contractVersion: "6" });
  return { ...parsed, contractVersion: "1", researchOptions: parseReportResearchOptions(researchOptions) };
}

export function webDirectRequest(payload: WebDirectReportPayload) {
  return { contractVersion: "1" as const, domain: payload.primaryDomain,
    comparisons: payload.productLimit, rivals: payload.productLimit,
    requestId: `website:${payload.publicId}:${payload.reportAttempt}`,
    includeAnalysis: payload.researchOptions.includeAnalysis,
    ...(payload.researchOptions.closePricePercent !== undefined ? { closePricePercent: payload.researchOptions.closePricePercent } : {}) };
}
