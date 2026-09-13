import { canonicalDomain } from "./domain.ts";
import { LocalMcpError, openLocalMcpDatabase } from "./local-mcp-store.ts";
import { accountResearchSetupMessage, localResearchStatus } from "./local-report-dispatch.ts";
import { LocalProviderStore, providerDatabasePath } from "./local-provider-store.ts";
import { claimMcpConfirmation, completeMcpConfirmation, consumeMcpRateLimit, issueMcpConfirmation, type McpCommandPrincipal } from "./mcp-command-store.ts";
import { createReportCommand, publicReportCommandFailure } from "./report-command-service.ts";

export type LocalReportInput = { primaryDomain: string; locale: "en" | "ar"; comparisons: number; closePricePercent?: number; includeAnalysis: boolean };
export type LocalMcpServices = {
  openDatabase: typeof openLocalMcpDatabase;
  createReport: typeof createReportCommand;
  setupMessage: (owner: McpCommandPrincipal) => string | null | Promise<string | null>;
  status: (owner: McpCommandPrincipal) => Record<string, unknown> | Promise<Record<string, unknown>>;
  now: () => Date;
};
export function localMcpServices(): LocalMcpServices {
  return { openDatabase: openLocalMcpDatabase, createReport: createReportCommand, setupMessage: accountResearchSetupMessage, now: () => new Date(),
    status: owner => {
      const store = new LocalProviderStore(providerDatabasePath());
      try { return { providerConfigured: store.summary(owner).configured, worker: localResearchStatus() }; }
      finally { store.close(); }
    } };
}
function normalizedInput(input: LocalReportInput): LocalReportInput {
  const domain = canonicalDomain(input.primaryDomain);
  if (!domain || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
    || /\.(localhost|local|internal|test|invalid|example)$/.test(domain)) throw new LocalMcpError("invalid-domain", "Enter a public store domain.");
  if (![20, 50, 500, 1000].includes(input.comparisons) || !["en", "ar"].includes(input.locale)
    || typeof input.includeAnalysis !== "boolean" || (input.closePricePercent !== undefined && (!Number.isInteger(input.closePricePercent) || input.closePricePercent < 1 || input.closePricePercent > 90))) {
    throw new LocalMcpError("invalid-options", "Choose a supported comparison count and price range.");
  }
  return { ...input, primaryDomain: domain };
}
export async function previewLocalReport(principal: McpCommandPrincipal, input: LocalReportInput, services: LocalMcpServices = localMcpServices()) {
  const args = normalizedInput(input);
  const setup = await services.setupMessage(principal);
  if (setup) throw new LocalMcpError("research-setup-required", setup);
  const database = await services.openDatabase();
  try {
    const now = services.now();
    consumeMcpRateLimit(database, principal, "local-report-preview", 20, 60, now);
    const impact = { ...args, reports: 1, execution: "local", provider: "account-owned OpenAI key", researchStarted: false };
    const confirmation = issueMcpConfirmation(database, principal, "report_create_confirm", args, impact, now);
    return { ok: true, confirmationToken: confirmation.confirmationToken, expiresAt: confirmation.expiresAt, impact,
      message: "Review the domain and options with the user before confirming. Confirmation starts one report using this account’s OpenAI key." };
  } finally { database.close(); }
}
export async function confirmLocalReport(principal: McpCommandPrincipal, token: string, origin: string, services: LocalMcpServices = localMcpServices()) {
  const database = await services.openDatabase();
  try {
    consumeMcpRateLimit(database, principal, "local-report-confirm", 10, 60, services.now());
    const claim = claimMcpConfirmation(database, principal, "report_create_confirm", token, services.now());
    if (claim.kind === "terminal") return { ...claim.outcome, replayed: true };
    if (claim.kind === "in_progress") return { ok: true, status: "in_progress", replayed: true, retryAfterSeconds: 10 };
    // The stable commandId is also enforced by the shared report store/queue.
    // On an uncertain exception leave the intent in progress; replay reuses that ID.
    const input = normalizedInput(claim.input as LocalReportInput);
    const result = await services.createReport({ primaryDomain: input.primaryDomain, locale: input.locale,
      actor: { workspaceId: principal.workspaceId, userId: principal.userId }, commandId: claim.commandId,
      comparisonTarget: input.comparisons, closePricePercent: input.closePricePercent, includeAnalysis: input.includeAnalysis });
    const outcome: Record<string, unknown> = result.ok === true ? {
      ok: true, status: result.report.status, replayed: result.replayed,
      report: { publicReportId: result.report.publicId, primaryDomain: result.report.primaryDomain,
        comparisons: result.report.productLimit, privateUrl: `${origin}/reports/${result.report.publicId}` },
      execution: "local", pollAfterSeconds: 10, nextTool: "report_get",
    } : { ...publicReportCommandFailure(result), error: { code: result.errorCode, message: result.error } };
    return completeMcpConfirmation(database, principal, "report_create_confirm", claim.commandId,
      result.ok === true ? "succeeded" : "failed", outcome, result.ok === true ? "" : result.errorCode, services.now());
  } finally { database.close(); }
}
