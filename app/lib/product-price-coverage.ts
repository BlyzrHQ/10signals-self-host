import type { EnrichmentGap } from "./storefront-product-enrichment.ts";

/** Discovery-only records do not prove that a fetched product had no price. */
export function unpricedCatalogLabel(product: Record<string, unknown>, ar: boolean) {
  if (product.extraction === "sitemap") return ar ? "رابط مكتشف — السعر غير متحقق" : "Discovered link — price not verified";
  return ar ? "لم يتم التحقق من سعر صالح" : "No verified usable price";
}

export function enrichmentGapMessage(gap: EnrichmentGap) {
  if (gap.failureKind === "robots" || gap.code === "fetch_failed") return `Page check incomplete: ${gap.reason}`;
  if (gap.code === "identity_mismatch") return `Product/market not verified: ${gap.reason}`;
  if (gap.code === "adapter_limited") return `${gap.failureKind === "adapter" ? "Price not verified" : "Price check incomplete"}: ${gap.reason}`;
  return gap.reason;
}
