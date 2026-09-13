export const PRODUCT_LAYOUTS = ["byproduct", "table", "matchups", "opportunities"] as const;
export type ProductLayout = typeof PRODUCT_LAYOUTS[number];

export const PRODUCT_LAYOUT_LABELS: Record<ProductLayout, { en: string; ar: string }> = {
  byproduct: { en: "By product", ar: "حسب المنتج" },
  table: { en: "Table", ar: "جدول" },
  matchups: { en: "Matchups", ar: "مواجهات" },
  opportunities: { en: "Opportunities", ar: "فرص" },
};

export function productLayoutFromSearch(search: string): ProductLayout {
  const value = new URLSearchParams(search).get("layout");
  return PRODUCT_LAYOUTS.includes(value as ProductLayout) ? value as ProductLayout : "byproduct";
}

export function productLayoutUrl(href: string, layout: ProductLayout): string {
  const url = new URL(href);
  url.searchParams.set("view", "products");
  url.searchParams.set("layout", layout);
  return url.href;
}

export function productLayoutKeyIndex(key: string, index: number, ar: boolean): number | null {
  if (key === "Home") return 0;
  if (key === "End") return PRODUCT_LAYOUTS.length - 1;
  if (key === (ar ? "ArrowLeft" : "ArrowRight")) return (index + 1) % PRODUCT_LAYOUTS.length;
  if (key === (ar ? "ArrowRight" : "ArrowLeft")) return (index - 1 + PRODUCT_LAYOUTS.length) % PRODUCT_LAYOUTS.length;
  return null;
}
