import { bilingualNormalize } from "./product-normalization.ts";

type ResearchProduct = { name: string; normalizedName?: string; category?: string };

function giftCard(product: ResearchProduct) {
  const value = bilingualNormalize(`${product.name} ${product.category || ""}`);
  return /\b(?:e\s*)?gift\s*(?:cards?|certificates?|vouchers?)\b|بطاق(?:ة|ه|ات)\s*هدايا|قسيم(?:ة|ه|ات)\s*هدايا/u.test(value);
}

/** Reorder work only; never merge product identities, prices or checkpoints. */
export function representativeProductOrder<T extends { primary: ResearchProduct }>(entries: T[]): T[] {
  const merchandise: T[] = [];
  const giftCards: T[] = [];
  for (const entry of entries) (giftCard(entry.primary) ? giftCards : merchandise).push(entry);
  const interleave = (items: T[]) => {
    const families = new Map<string, T[]>();
    for (const item of items) {
      const family = bilingualNormalize(item.primary.normalizedName || item.primary.name);
      const group = families.get(family) || [];
      group.push(item);
      families.set(family, group);
    }
    const groups = [...families.values()];
    const ordered: T[] = [];
    for (let depth = 0; ordered.length < items.length; depth++) {
      for (const group of groups) if (group[depth]) ordered.push(group[depth]);
    }
    return ordered;
  };
  return [...interleave(merchandise), ...interleave(giftCards)];
}
