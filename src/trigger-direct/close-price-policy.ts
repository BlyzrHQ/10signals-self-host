import { closePriceMatch } from "../../app/lib/close-price.ts";
import { directProductContradictions } from "../../app/lib/direct-product-compatibility.ts";
import type { ProductComparison } from "../../app/lib/product-intelligence.ts";
import { limitPublishedProductComparison } from "../../app/lib/product-match-lifecycle.ts";

/** Re-run after enrichment/repair; old broad-mode callers are an exact no-op. */
export function constrainClosePrice(comparison: ProductComparison, percent: number | undefined, target: number, now = Date.now()) {
  if (percent === undefined) return comparison;
  const gaps: string[] = [];
  const rows = comparison.rows.map(row => ({ ...row, matches: row.matches.filter(match => {
    if (!match.product) return false;
    const check = closePriceMatch(row.primary, match.product, percent, now);
    const contradictions = directProductContradictions(row.primary, match.product);
    if (check.eligible && !contradictions.length) return true;
    gaps.push(`${row.primary.name}: removed ${match.product.sourceUrl} after enrichment/repair (${contradictions.join(", ") || check.reason}; close-price +/-${percent}%).`);
    return false;
  }) })).filter(row => row.matches.length);
  return limitPublishedProductComparison({ ...comparison, rows,
    ...(comparison.matching ? { matching: { ...comparison.matching, gaps: [...new Set([...comparison.matching.gaps, ...gaps])].slice(0, 40) } } : {}),
  }, target, "pairs");
}
