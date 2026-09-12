import { auth, tasks } from "@trigger.dev/sdk";
import type { marketSignalReportOrchestration } from "../../src/trigger/report-orchestration.ts";
import {
  reportOrchestrationWireVersion,
  type PublishedResultTargetKind,
  type ReportOrchestrationPayload,
  type ReportOrchestrationWirePayload,
} from "../../src/shared/report-orchestration-contract.ts";
import { runtimeEnvironmentValue } from "./runtime-env.ts";
import type { ProductPlan } from "./product-entitlements.ts";
import { parseWebDirectReportPayload, type ReportResearchOptions, type WebDirectReportPayload } from "../../src/shared/web-direct-report-contract.ts";
import type { webDirectReport } from "../../src/trigger/web-direct-report.ts";
import { localExecutionEnabled } from "./self-host-config.ts";

export const REPORT_TASK_ID = "market-signal-report-orchestration" as const;
export const WEB_DIRECT_REPORT_TASK_ID = "market-signal-web-direct-report" as const;
export const REPORT_DISPATCH_IDEMPOTENCY_TTL = "24h" as const;

export type DispatchableReport = {
  publicId: string;
  primaryDomain: string;
  locale: "en" | "ar";
  attemptCount: number;
  productPlan?: ProductPlan;
  productLimit?: number;
  productTargetKind?: PublishedResultTargetKind;
  researchOptions?: ReportResearchOptions;
};

type TriggerHandle = { id: string };
type TriggerReport = (payload: ReportOrchestrationWirePayload, options: { idempotencyKey: string; idempotencyKeyTTL: string; tags: string[] }) => Promise<TriggerHandle>;
type TriggerDirectReport = (payload: WebDirectReportPayload, options: { idempotencyKey: string; idempotencyKeyTTL: string; tags: string[]; version: string }) => Promise<TriggerHandle>;

function dispatchIdentity(report: DispatchableReport) {
  const productPlan = report.productPlan || "starter";
  const productLimit = report.productLimit || 20;
  const productTargetKind = report.productTargetKind || "pairs";
  return { productPlan, productLimit, contractVersion: reportOrchestrationWireVersion(productPlan, productLimit, productTargetKind) };
}

export function reportDispatchIdempotencyKey(report: DispatchableReport) {
  if (report.researchOptions) return `${report.publicId}:web-direct-v1:${report.attemptCount}`;
  return `${report.publicId}:${dispatchIdentity(report).contractVersion}:${report.attemptCount}`;
}

export class ReportDispatchError extends Error {
  readonly code: "trigger-secret-unavailable" | "trigger-request-failed" | "trigger-worker-unavailable" | "local-provider-unavailable" | "local-worker-unavailable";

  constructor(code: ReportDispatchError["code"]) {
    super("The background report job could not be started.");
    this.name = "ReportDispatchError";
    this.code = code;
  }
}

function publicDispatchError(code: ReportDispatchError["code"]) {
  return new ReportDispatchError(code);
}

export async function dispatchReportJob(report: DispatchableReport, options: { secret?: string; trigger?: TriggerReport; triggerDirect?: TriggerDirectReport; workerVersion?: string } = {}) {
  if (localExecutionEnabled()) {
    const { enqueueLocalReport } = await import("./local-report-dispatch.ts");
    try { return enqueueLocalReport(report); }
    catch (error) {
      if (error instanceof Error && error.message === "LOCAL_PROVIDER_NOT_CONFIGURED") throw new ReportDispatchError("local-provider-unavailable");
      if (error instanceof Error && error.message === "LOCAL_WORKER_NOT_READY") throw new ReportDispatchError("local-worker-unavailable");
      throw error;
    }
  }
  if (report.researchOptions) return dispatchDirectReportJob(report, options);
  const secret = await runtimeEnvironmentValue("TRIGGER_SECRET_KEY", options.secret);
  if (!options.trigger && !/^tr_(?:prod|dev)_[A-Za-z0-9_-]+$/.test(secret)) throw publicDispatchError("trigger-secret-unavailable");
  const identity = dispatchIdentity(report);
  const payload: ReportOrchestrationWirePayload = {
    contractVersion: identity.contractVersion,
    publicId: report.publicId,
    primaryDomain: report.primaryDomain,
    locale: report.locale,
    reportAttempt: report.attemptCount,
    productPlan: identity.productPlan,
    productLimit: identity.productLimit,
  };
  const triggerOptions = {
    idempotencyKey: reportDispatchIdempotencyKey(report),
    idempotencyKeyTTL: REPORT_DISPATCH_IDEMPOTENCY_TTL,
    tags: [`report:${report.publicId}`],
  };
  try {
    const handle = options.trigger
      ? await options.trigger(payload, triggerOptions)
      : await auth.withAuth({ accessToken: secret }, () => tasks.trigger<typeof marketSignalReportOrchestration>(REPORT_TASK_ID, payload as ReportOrchestrationPayload, triggerOptions));
    if (!handle || typeof handle.id !== "string" || !/^run_[A-Za-z0-9]+$/.test(handle.id)) throw publicDispatchError("trigger-request-failed");
    return { runId: handle.id, idempotencyKey: triggerOptions.idempotencyKey };
  } catch (error) {
    if (error instanceof ReportDispatchError) throw error;
    throw publicDispatchError("trigger-request-failed");
  }
}

async function dispatchDirectReportJob(report: DispatchableReport, options: { secret?: string; triggerDirect?: TriggerDirectReport; workerVersion?: string }) {
  const secret = await runtimeEnvironmentValue("TRIGGER_SECRET_KEY", options.secret);
  if (!options.triggerDirect && !/^tr_(?:prod|dev)_[A-Za-z0-9_-]+$/.test(secret)) throw publicDispatchError("trigger-secret-unavailable");
  const version = await runtimeEnvironmentValue("MARKET_SIGNAL_WEB_DIRECT_WORKER_VERSION", options.workerVersion);
  if (!/^\d{8}\.\d+$/.test(version)) throw publicDispatchError("trigger-worker-unavailable");
  const payload = parseWebDirectReportPayload({ contractVersion: "1", publicId: report.publicId,
    primaryDomain: report.primaryDomain, locale: report.locale, reportAttempt: report.attemptCount,
    productPlan: report.productPlan || "starter", productLimit: report.productLimit || 20,
    researchOptions: report.researchOptions });
  const triggerOptions = { version, idempotencyKey: reportDispatchIdempotencyKey(report),
    idempotencyKeyTTL: REPORT_DISPATCH_IDEMPOTENCY_TTL, tags: [`report:${report.publicId}`, "source:website"] };
  try {
    const handle = options.triggerDirect ? await options.triggerDirect(payload, triggerOptions)
      : await auth.withAuth({ accessToken: secret }, () => tasks.trigger<typeof webDirectReport>(WEB_DIRECT_REPORT_TASK_ID, payload, triggerOptions));
    if (!handle || typeof handle.id !== "string" || !/^run_[A-Za-z0-9]+$/.test(handle.id)) throw publicDispatchError("trigger-request-failed");
    return { runId: handle.id, idempotencyKey: triggerOptions.idempotencyKey };
  } catch {
    throw publicDispatchError("trigger-request-failed");
  }
}
