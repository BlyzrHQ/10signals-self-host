import { hasComparablePublicPrice, type ProductRecord } from "./product-intelligence.ts";
import { parseCanonicalQuantity, quantitiesConflict, quantitiesEqual } from "./product-normalization.ts";

type PriceProduct = Pick<ProductRecord, "name" | "domain" | "sourceUrl" | "observedAt" | "priceSignals"> & Partial<Pick<ProductRecord, "attributes" | "quantity">>;
export const CLOSE_PRICE_BASIS = "first-observed-displayed-offer";
export function validateClosePricePercent(percent: number) {
  if (!Number.isInteger(percent) || percent < 1 || percent > 90) throw new Error("INVALID_CLOSE_PRICE_PERCENT: expected integer 1..90");
}

function price(product: PriceProduct, now: number) {
  // Publication uses priceSignals[0]. Never choose a different offer just to fit
  // the band. The shared validator checks attribution and raw-price integrity.
  if (!hasComparablePublicPrice(product as ProductRecord, now)) return null;
  const signal = product.priceSignals[0];
  if (signal.period?.trim()) return null;
  return { amount: signal.amount!, currency: signal.currency!.trim().toUpperCase() };
}

export function closePriceSearchContext(primary: PriceProduct, percent: number, now = Date.now()) {
  validateClosePricePercent(percent);
  const p = price(primary, now);
  if (!p) return null;
  const minimumAmount = p.amount * ((100 - percent) / 100), maximumAmount = p.amount * ((100 + percent) / 100);
  if (!Number.isFinite(maximumAmount)) return null;
  return { basis: CLOSE_PRICE_BASIS, tolerancePercent: percent, currency: p.currency,
    primaryAmount: p.amount, minimumAmount, maximumAmount };
}

export function closePriceMatch(primary: PriceProduct, rival: PriceProduct, percent: number, now = Date.now()) {
  const band = closePriceSearchContext(primary, percent, now);
  const r = price(rival, now);
  if (!band) return { eligible: false as const, reason: "primary-price-unverified" };
  if (!r) return { eligible: false as const, reason: "rival-price-unverified" };
  if (band.currency !== r.currency) return { eligible: false as const, reason: "different-currency" };
  const quantity = (product: PriceProduct) => {
    // Canonical facts can carry an empty quantity object; it is not evidence.
    const q = product.quantity;
    return q?.kind && q.unit && Number.isFinite(q.amount) && q.amount > 0 ? q
      // Attributes can contain historical sitemap names, diagnostic messages,
      // and URLs. They are provenance, not a second current quantity label.
      : parseCanonicalQuantity(product.name) || undefined;
  };
  const left = quantity(primary), right = quantity(rival);
  if (quantitiesConflict(left, right)) return { eligible: false as const, reason: "different-observed-quantities" };
  // Ratio comparison avoids overflow for very large prices. The epsilon only
  // covers floating arithmetic at the boundary, not an extra price allowance.
  const ratio = r.amount / band.primaryAmount;
  const epsilon = Number.EPSILON * 8;
  if (!Number.isFinite(ratio) || ratio < (100 - percent) / 100 - epsilon || ratio > (100 + percent) / 100 + epsilon) {
    return { eligible: false as const, reason: "outside-close-price-band" };
  }
  return { eligible: true as const, reason: "within-close-price-band", ...band, rivalAmount: r.amount,
    differencePercent: (ratio - 1) * 100,
    quantityBasis: left && right && quantitiesEqual(left, right) ? "observed-equal" : "unknown",
    note: "Displayed offer prices only; not normalized unit value, landed cost, or proof of equivalent quality. Unknown quantities remain unverified." };
}
