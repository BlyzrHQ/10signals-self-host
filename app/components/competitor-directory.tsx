"use client";

import { useRef, useState } from "react";
import { CompetitorPriceWatch } from "./competitor-price-watch";
import { EvidenceTag, type EvidenceState } from "./signal-overview";

export type DirectoryRival = {
  domain: string;
  name: string;
  reason: string;
  relationship: string;
  confidence: string;
  count: number;
  score: number;
  source: string;
  productHref: string;
  anchor: string;
  category?: string;
  overlapTerms?: string[];
  hasProductOverlap?: boolean;
  productCount?: number;
  matchedProductName?: string;
  sources?: Array<{ url: string; label: string }>;
  observedAt?: string;
  pairDerived?: boolean;
  regionCompatibility?: boolean | null;
  categoryAlignment?: boolean | null;
};

function confidenceLabel(value: string, ar: boolean) {
  const word = value.toLowerCase();
  if (word === "high") return ar ? "ثقة عالية" : "High confidence";
  if (word === "medium") return ar ? "ثقة متوسطة" : "Medium confidence";
  if (word === "low") return ar ? "ثقة منخفضة" : "Low confidence";
  return value || (ar ? "الثقة غير مسجلة" : "Confidence not recorded");
}

function observed(value: string | undefined, ar: boolean) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat(ar ? "ar" : "en", { day: "numeric", month: "short", year: "numeric" }).format(parsed) : "";
}

function sourceLabel(url: string) { try { const parsed = new URL(url); return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`; } catch { return url; } }

function Dossier({ rival, publicId, matchesEndpoint, workspaceMode, ar }: { rival: DirectoryRival; publicId: string; matchesEndpoint: string; workspaceMode: boolean; ar: boolean }) {
  const [opened, setOpened] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const websiteUrl = /^https?:\/\//i.test(rival.source) ? rival.source : `https://${rival.domain}`;
  const evidence: Array<{ state: EvidenceState; text: string }> = [];
  if (rival.category) evidence.push({ state: "observed", text: `${ar ? "الفئة" : "Category"}: ${rival.category}` });
  if (rival.regionCompatibility === true) evidence.push({ state: "inferred", text: ar ? "المنطقة: متوافقة (مستنتج من الصفحات العامة)" : "Region: compatible (inferred from public pages)" });
  else if (rival.regionCompatibility === false) evidence.push({ state: "limited", text: ar ? "المنطقة: لم تُؤكَّد" : "Region: not confirmed" });
  if (rival.overlapTerms?.length) evidence.push({ state: "observed", text: `${ar ? "التداخل" : "Overlap"}: ${rival.overlapTerms.length} ${ar ? "مصطلحات مشتركة" : "shared terms"}` });
  else if (rival.hasProductOverlap) evidence.push({ state: "observed", text: ar ? "التداخل: منتجات مقارنة مقبولة" : "Overlap: accepted product comparisons" });
  else evidence.push({ state: "limited", text: ar ? "التداخل: لم يُثبت في هذا التشغيل" : "Overlap: not proven in this run" });
  if (rival.matchedProductName) evidence.push({ state: "observed", text: `${ar ? "منتج مثبت" : "Proven product"}: ${rival.matchedProductName}` });
  if (rival.pairDerived && !rival.category) evidence.push({ state: "observed", text: ar ? "مصدر مقارنة سعرية مقبولة" : "Supplies an accepted priced comparison" });
  const sources = (rival.sources || []).filter((item) => /^https?:\/\//i.test(item.url)).filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index).slice(0, 3);
  const observedAt = observed(rival.observedAt, ar);
  return <article className="rp-competitor" id={rival.anchor}>
    <div>
      <div className="rp-competitor-title"><h3 dir="auto">{rival.name}</h3><a href={websiteUrl} target="_blank" rel="noreferrer">{rival.domain} ↗</a></div>
      <p className="rp-competitor-reason">{rival.reason}</p>
      <div className="rp-tags">{evidence.map((item, index) => <EvidenceTag key={index} state={item.state} label={item.text} />)}</div>
    </div>
    <div className="rp-facts">
      <div><p className="ds-label">{ar ? "التحقق" : "Verification"}</p>{rival.score > 0 ? <p className="rp-fact-value">{rival.score}<small>/100</small></p> : <p className="rp-fact-value is-hollow">○ {ar ? "لم تُسجَّل درجة" : "Not scored"}</p>}<p>{confidenceLabel(rival.confidence, ar)}</p></div>
      <div><p className="ds-label">{ar ? "مطابقات مقبولة" : "Accepted matches"}</p><p className="rp-fact-value">{rival.count}</p><p>{rival.productCount ? `${ar ? "من" : "of"} ${rival.productCount} ${ar ? "منتجات مرصودة" : "products observed"}` : rival.relationship}</p></div>
      <div className="rp-span"><p className="ds-label">{ar ? "المصادر" : "Sources"}</p>{sources.length ? <p className="rp-sources">{sources.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" title={item.label}>{sourceLabel(item.url)}</a>)}</p> : <p>{ar ? "لم يُحفظ رابط مصدر لهذا المنافس." : "No source link was saved for this competitor."}</p>}{observedAt && <p>{ar ? "رُصد" : "Observed"} {observedAt}</p>}</div>
    </div>
    <div className="rp-competitor-side">
      <a className="ds-btn ds-btn-primary" href={rival.productHref}>{rival.count} {ar ? "مقابلات" : "matchups"} →</a>
      {workspaceMode && <button type="button" className="ds-btn-ghost" onClick={() => { setOpened(true); drawer.current?.showModal(); }}>{ar ? "راقب الأسعار…" : "Watch prices…"}</button>}
    </div>
    {workspaceMode && <dialog className="signal-drawer research-rival-drawer" ref={drawer} aria-label={ar ? `مراقبة أسعار ${rival.name}` : `Price watch: ${rival.name}`} onClose={() => setOpened(false)}>
      <div className="signal-drawer-content" dir={ar ? "rtl" : "ltr"}>
        <header><h2 dir="auto">{rival.name}</h2><button type="button" autoFocus onClick={() => drawer.current?.close()}>{ar ? "إغلاق" : "Close"}</button></header>
        <p className="rp-crumbs-domain">{rival.domain}</p>
        {workspaceMode && opened && <CompetitorPriceWatch publicId={publicId} matchesEndpoint={matchesEndpoint} rivals={[{ domain: rival.domain, count: rival.count }]} onlyDomain={rival.domain} ar={ar} />}
      </div>
    </dialog>}
  </article>;
}

export function CompetitorDirectory({ rivals, publicId, matchesEndpoint, workspaceMode, ar }: {
  rivals: DirectoryRival[]; publicId: string; matchesEndpoint: string; workspaceMode: boolean; ar: boolean;
}) {
  if (!rivals.length) return null;
  return <>{rivals.map((rival) => <Dossier key={rival.domain} rival={rival} publicId={publicId} matchesEndpoint={matchesEndpoint} workspaceMode={workspaceMode} ar={ar} />)}</>;
}
