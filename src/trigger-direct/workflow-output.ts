import { WorkflowStore } from "./workflow-state.ts";
import { closePriceMatch, CLOSE_PRICE_BASIS } from "../../app/lib/close-price.ts";
import type { ProductRecord } from "../../app/lib/product-intelligence.ts";
import { reportFactProduct, type ReportFactBundle } from "../shared/report-facts.ts";
import { PermanentOrchestrationError } from "../shared/report-orchestration-contract.ts";
import type { DirectRequest } from "./core.ts";

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue { return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {}; }
// This exact invariant runs before fact persistence/completion and again at
// output, on the same canonical facts. A disagreement is not a transient call.
export function publicationComparisons(request: DirectRequest, chunks: ReportFactBundle["chunks"], manifestId: string | undefined, observedAt: string) {
  const facts = (kind: "products" | "matches") => chunks.filter(chunk => chunk.manifestId === manifestId && chunk.kind === kind).flatMap(chunk => chunk.items);
  const products = facts("products");
  const byProduct = new Map(products.map((product) => [`${product.domain}\n${product.productId}`, product]));
  const comparisons = facts("matches").flatMap((match) => {
    const primary = byProduct.get(`${request.domain}\n${match.primaryProductId}`);
    const rival = byProduct.get(`${match.rivalDomain}\n${match.rivalProductId}`);
    const evidence = record(match.evidence);
    if (!primary || !rival || record(evidence.publication).priceEligible !== true || !Array.isArray(primary.prices) || !primary.prices.length || !Array.isArray(rival.prices) || !rival.prices.length) {
      if (request.closePricePercent !== undefined) throw new PermanentOrchestrationError("CLOSE_PRICE_PUBLICATION_CONFLICT: missing-eligible-product-facts");
      return [];
    }
    const primaryProduct = reportFactProduct(primary), rivalProduct = reportFactProduct(rival);
    const priceMatch = request.closePricePercent !== undefined
      ? closePriceMatch(primaryProduct as ProductRecord, rivalProduct as ProductRecord, request.closePricePercent, Date.parse(observedAt)) : undefined;
    if (priceMatch && !priceMatch.eligible) throw new PermanentOrchestrationError(`CLOSE_PRICE_PUBLICATION_CONFLICT: ${priceMatch.reason}`);
    return [{ primaryProduct, rivalProduct, assessment: { verdict: match.verdict, confidence: match.confidence, claimType: match.claimType, model: match.model, ...evidence }, recommendation: record(evidence.decision).actionPlan || null,
      ...(priceMatch ? { priceMatch } : {}) }];
  });
  const domains = [...new Set(comparisons.map((pair) => String(pair.rivalProduct.domain)))];
  if (domains.length > request.rivals || comparisons.length > request.comparisons) throw new PermanentOrchestrationError("PUBLICATION_LIMIT_CONFLICT");
  return comparisons;
}

// Read the authoritative fact set, not the compacted UI's first few rows.
export function workflowOutput(store: WorkflowStore) {
  const state = store.read();
  const manifest = state.report.factManifest;
  const facts = (kind: "companies" | "products" | "matches") => state.chunks.filter((chunk) => chunk.manifestId === manifest?.manifestId && chunk.kind === kind).flatMap((chunk) => chunk.items);
  const products = facts("products");
  const comparisons = publicationComparisons(state.request, state.chunks, manifest?.manifestId, state.report.run.updatedAt);
  const domains = [...new Set(comparisons.map(pair => String(pair.rivalProduct.domain)))];
  const document = record(record(state.document).document);
  const blocks = Array.isArray(document.blocks) ? document.blocks.map(record) : [];
  const qualityEvents = state.report.events.filter((event) => event.phase === "quality");
  const evaluation = qualityEvents.at(-1)?.metadata || null;
  const status = state.report.run.status;
  return {
    contractVersion: "1", request: state.request,
    status: status === "complete" && comparisons.length < state.request.comparisons ? "limited" : status,
    startedAt: state.report.run.createdAt, completedAt: state.report.run.updatedAt,
    comparisons,
    ...(state.request.closePricePercent !== undefined ? { searchOptions: { mode: "close-price", tolerancePercent: state.request.closePricePercent,
      basis: CLOSE_PRICE_BASIS, currencyConversion: false, automaticallyWidened: false,
      shortfall: Math.max(0, state.request.comparisons - comparisons.length) } } : {}),
    competitors: domains.map((domain) => ({ ...facts("companies").find((company) => company.domain === domain), domain, comparisonCount: comparisons.filter((pair) => pair.rivalProduct.domain === domain).length })),
    metrics: { requestedComparisons: state.request.comparisons, pricedComparisons: comparisons.length, competitors: domains.length,
      catalogProducts: products.filter((product) => product.domain === state.request.domain).length,
      completedProviderOperations: Object.values(state.operations).filter((operation) => operation.status === "complete").length },
    evaluation: { basis: "deterministic-report-quality-gate", result: evaluation, events: qualityEvents },
    benchmarks: blocks.filter((block) => block.type === "experience-benchmark"),
    optionalAnalysis: state.request.includeAnalysis === false
      ? { requested: false, aiRecommendations: "not-requested", rivalExperienceScores: "not-assessed", recommendations: "deterministic" }
      : { requested: true, aiRecommendations: "see-recommendation-evidence", rivalExperienceScores: "see-benchmark-coverage" },
    report: state.document, facts: { manifest, companies: facts("companies"), products, matches: facts("matches") },
    progress: state.report.events,
    diagnostics: {
      elapsedMs: Math.max(0, Date.parse(state.report.run.updatedAt) - Date.parse(state.report.run.createdAt)),
      stateRevisions: state.revision,
      operations: Object.values(state.operations).map(operation => ({ kind: operation.kind || "legacy-unknown", status: operation.status,
        startedAt: operation.startedAt || null, completedAt: operation.completedAt || null, durationMs: operation.durationMs ?? null,
        providerUsage: record(operation.result).providerUsage || null })),
      note: "Provider token/tool receipts are usage evidence, not a settled invoice. Legacy runs without receipts remain unknown.",
    },
    limitations: ["Public-source search matches are inferred alternatives, not independent exact-product certification.",
      ...(state.request.closePricePercent !== undefined ? [`Close-price mode returns only verified same-currency displayed offers within +/-${state.request.closePricePercent}%. Missing/changed primary prices, known quantity conflicts and out-of-band rivals are excluded; any remaining shortfall stays limited, never silently widened. This does not certify premium quality or comparable unit value.`] : []),
      "The contradiction screen rejects known function, bundle and quantity conflicts, but unknown functions or unspecified pack contents remain unverified; raw price differences are not guaranteed savings.",
      "The website's research engine runs inside Trigger; network access can differ from the VPS.",
      "Cross-report competitor memory is not enabled. Trigger retention limits apply to checkpoints and results.",
      "AI provider cost is unknown; null must never be interpreted as zero."],
    costMicrousd: null,
  };
}
