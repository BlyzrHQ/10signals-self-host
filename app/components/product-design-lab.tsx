"use client";

import Link from "next/link";
import { unpricedCatalogLabel } from "../lib/product-price-coverage.ts";
import { productLayoutKeyIndex } from "../lib/product-layout.ts";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPriceClaim, formatPriceDifference, resolvePriceClaim, type PriceClaim } from "../lib/price-claims";
import { jsonResponseErrorMessage, readJsonResponse } from "../lib/json-response";
import { ActionSeparator, EdgeStateCard, EvidenceTag, evidenceStateLabel, VerdictMark, type EvidenceState } from "./signal-overview";

export type ProductBattle = {
  primary: Record<string, unknown>;
  rival: Record<string, unknown>;
  match: Record<string, unknown>;
  key: string;
};

export type ProductView = "byproduct" | "table" | "matchups" | "opportunities";
export const PRODUCT_VIEWS: ProductView[] = ["byproduct", "table", "matchups", "opportunities"];
const PAGE_SIZE = 20;

type ProductDesignLabProps = {
  comparison?: Record<string, unknown>;
  battles: ProductBattle[];
  primaryProducts?: { authoritative: boolean; totalCount: number; products: Array<Record<string, unknown>>; truncated: boolean };
  publicId: string;
  matchesEndpoint: string;
  workspaceMode: boolean;
  authoritativeMatchTotal?: number;
  onAuthoritativeSummary?: (summary: { totalCount: number; domainCounts: Record<string, number> }) => void;
  primaryDomain: string;
  observedAt: string;
  ar: boolean;
  view: ProductView;
  onViewChange: (view: ProductView) => void;
  competitorFilter: string;
  onCompetitorFilterChange: (domain: string) => void;
  competitorCounts?: Record<string, number>;
};

function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function list(value: unknown) { return Array.isArray(value) ? value : []; }
function numeric(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function repairEncoding(value: string) {
  if (!/(?:Ãƒ|Ã‚|Ã˜|Ã™|Ã¢)/.test(value)) return value;
  try {
    const bytes = Uint8Array.from([...value].map((character) => character.charCodeAt(0)));
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return repaired.includes("�") ? value : repaired;
  } catch { return value; }
}
function display(value: unknown, fallback = "") { return repairEncoding(typeof value === "string" ? value : "").replace(/&ndash;/g, "–").replace(/&amp;/g, "&").trim() || fallback; }
function safeUrl(value: unknown) { const url = display(value); return /^https?:\/\/[^\s]+$/i.test(url) ? url : ""; }
function slug(value: unknown) { return display(value, "item").toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "") || "item"; }
function urlPath(value: string) { try { const url = new URL(value); return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`; } catch { return value; } }
function productPrice(product: Record<string, unknown>) {
  const signals = list(product.priceSignals).map(object);
  const priced = signals.flatMap((signal) => typeof signal.amount === "number" && display(signal.currency) ? [{ amount: signal.amount, currency: display(signal.currency) }] : []);
  const currencies = [...new Set(priced.map((item) => item.currency))];
  const amounts = [...new Set(priced.map((item) => item.amount))].sort((left, right) => left - right);
  if (currencies.length === 1 && amounts.length > 1) return `${currencies[0]} ${amounts[0]}–${amounts.at(-1)}`;
  return signals.map((item) => display(item.raw)).filter(Boolean)[0] || "";
}
function conciseAction(value: unknown, fallback: string, limit = 96) {
  const full = display(value, fallback);
  const firstSentence = full.match(/^.*?[.!?؟](?:\s|$)/)?.[0]?.trim() || "";
  const sentence = firstSentence.length >= 15 ? firstSentence : full;
  if (sentence.length <= limit) return sentence;
  const clipped = sentence.slice(0, limit - 1).replace(/\s+\S*$/, "").trim();
  return `${clipped || sentence.slice(0, limit - 1).trim()}…`;
}
function csvCell(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function observedDate(value: string, ar: boolean) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat(ar ? "ar" : "en", { day: "numeric", month: "short", year: "numeric" }).format(parsed) : (ar ? "غير معروف" : "Unknown");
}
function suppressionReasonLabel(reason: string, count: number, ar: boolean) {
  const labels: Record<string, { en: string; ar: string }> = {
    "insufficient-match-confidence": { en: "low-confidence matches", ar: "مطابقات منخفضة الثقة" },
    "missing-valid-primary-price": { en: "matches missing your valid public price", ar: "مطابقات ينقصها سعرك العام الصالح" },
    "missing-valid-rival-price": { en: "matches missing a valid rival public price", ar: "مطابقات ينقصها سعر منافس عام صالح" },
    "incompatible-price-currency": { en: "matches with incompatible currencies", ar: "مطابقات بعملات غير متوافقة" },
    "incompatible-market": { en: "matches from a different regional market", ar: "مطابقات من سوق إقليمي مختلف" },
  };
  const label = labels[reason]?.[ar ? "ar" : "en"] || (ar ? "مطابقات مستبعدة أخرى" : "other excluded matches");
  return `${count} ${label}`;
}

type ProductRow = ReturnType<typeof prepareRow>;

export function evidenceLabel(value: string, ar: boolean) {
  const key = value.toLowerCase().replace(/_/g, " ");
  const labels: Record<string, string> = { observed:"مرصود", inferred:"مستنتج", limited:"محدود", unavailable:"غير متاح", high:"عالية", medium:"متوسطة", low:"منخفضة", "same product":"نفس المنتج", "close substitute":"بديل قريب", "limited confidence":"ثقة محدودة" };
  return ar ? labels[key] || value : key.charAt(0).toUpperCase() + key.slice(1);
}

function confidenceCopy(assessment: Record<string, unknown>, matchConfidence: string, ar: boolean) {
  const score = Number(assessment.confidence);
  if (Number.isFinite(score) && score >= 0 && score <= 1) {
    const band = score >= .85 ? (ar ? "عالية" : "high") : score >= .7 ? (ar ? "متوسطة" : "medium") : (ar ? "منخفضة" : "low");
    return `${Math.round(score * 100)}% · ${band}`;
  }
  const word = matchConfidence.toLowerCase();
  if (word === "high") return ar ? "ثقة عالية" : "High confidence";
  if (word === "medium") return ar ? "ثقة متوسطة" : "Medium confidence";
  if (word === "low") return ar ? "ثقة منخفضة" : "Low confidence";
  return ar ? "ثقة محدودة" : "Limited confidence";
}

export function prepareRow(battle: ProductBattle, ar: boolean) {
  const domain = display(battle.match.domain || battle.rival.domain);
  const assessment = object(battle.match.assessment);
  const savedDecision = object(battle.match.decision);
  // The direct CLI verifies a priced page, not equivalent product/pack identity.
  // Retain the original evidence, but do not promote its arithmetic to a verified
  // like-for-like claim in the product workspace.
  const decision = assessment.method === "direct-web-search" || assessment.verdict === "search_result"
    ? { ...savedDecision, priceComparison: null }
    : savedDecision;
  const actionPlan = object(decision.actionPlan);
  const primaryPrice = productPrice(battle.primary);
  const rivalPrice = productPrice(battle.rival);
  const priceClaim = resolvePriceClaim({
    comparisonValue: decision.priceComparison,
    primaryRaw: primaryPrice,
    rivalRaw: rivalPrice,
    primaryQuantity: battle.primary.quantity,
    rivalQuantity: battle.rival.quantity,
  });
  const priceCopy = formatPriceClaim(priceClaim, ar ? "ar" : "en");
  const difference = formatPriceDifference(priceClaim, ar ? "ar" : "en");
  const primaryDisplay = priceClaim.primaryRaw || primaryPrice;
  const rivalDisplay = priceClaim.rivalRaw || rivalPrice;
  const primarySource = safeUrl(battle.primary.sourceUrl);
  const rivalSource = safeUrl(battle.rival.sourceUrl);
  const reasonList = list(assessment.reasons).map((value) => display(value)).filter(Boolean);
  const sharedTerms = list(battle.match.sharedTerms).map((value) => display(value)).filter(Boolean);
  const reasons = (reasonList.length ? reasonList : sharedTerms).join(" · ");
  const contradictions = list(assessment.contradictions).map((value) => display(value)).filter(Boolean);
  const verdictValue = display(assessment.verdict);
  const verdictSame = verdictValue === "same_product";
  const verdict = verdictValue === "search_result"
    ? (ar ? "نتيجة بحث بسعر معلن" : "Priced search result")
    : display(verdictValue, ar ? "بديل قريب" : "Close substitute");
  const verdictLabel = verdictSame ? (ar ? "المنتج نفسه" : "Same product") : verdictValue === "search_result" ? verdict : (ar ? "بديل قريب" : "Close substitute");
  const actionEn = display(actionPlan.actionEn, display(decision.recommendedMove));
  const actionAr = display(actionPlan.actionAr, actionEn);
  const fullAction = display(ar ? actionAr : actionEn, ar ? "راجع المنتجين قبل اتخاذ قرار." : "Review both products before acting.");
  const shortAction = conciseAction(fullAction, ar ? "راجع المنتجين قبل اتخاذ قرار." : "Review both products before acting.");
  const actionRationale = display(ar ? actionPlan.rationaleAr : actionPlan.rationaleEn, display(decision.whyTheyMayWin));
  const actionSource = actionPlan.source === "ai" ? "ai" : "deterministic";
  const actionModel = display(actionPlan.model);
  const actionPromptVersion = display(actionPlan.promptVersion);
  const actionEvidenceKeys = list(actionPlan.evidenceKeys).map((value) => display(value)).filter(Boolean);
  const priceStatus = priceClaim.kind;
  const priceSignal = priceCopy.headline;
  const priceDetail = priceCopy.detail;
  const lane = priceCopy.lane;
  const claimType = display(assessment.claimType, "inferred").toLowerCase();
  const confidence = display(battle.match.confidence, ar ? "ثقة محدودة" : "Limited confidence");
  const matchConfidence = display(battle.match.confidence);
  const matchStatus = matchConfidence && matchConfidence !== "Low" ? "accepted" : "limited";
  const primaryObservedAt = display(battle.primary.observedAt);
  const rivalObservedAt = display(battle.rival.observedAt);
  const rivalPriceMissing = !rivalDisplay;
  const evidence: EvidenceState = priceClaim.kind === "one-observed" || priceClaim.kind === "none-observed" ? "limited" : claimType === "observed" ? "observed" : "inferred";
  const confidenceLabel = confidenceCopy(assessment, matchConfidence, ar);
  const equal = (priceClaim.kind === "direct" && priceClaim.equal) || priceClaim.kind === "listed-equal";
  const diffTone: "you" | "rival" | "equal" | "evidence" = equal ? "equal" : lane === "advantage" ? "you" : lane === "pressure" ? "rival" : "evidence";
  const diff = lane === "evidence" && !equal
    ? (rivalPriceMissing || !primaryDisplay ? (ar ? "غير قابل للحساب" : "Not calculable") : (ar ? "يحتاج دليلاً" : "Needs evidence"))
    : difference.direction;
  const diffBasis = lane === "evidence" && !equal
    ? (rivalPriceMissing ? (ar ? "سعر المنافس غير مرصود" : "Rival price not observed") : `${difference.direction} · ${difference.note}`)
    : `${difference.value !== "—" ? `${difference.value} · ` : ""}${difference.note}`;
  const method = [display(assessment.method), actionModel || display(assessment.model), display(assessment.promptVersion)].filter(Boolean).join(" · ");
  return { battle, domain, assessment, decision, primaryDisplay, rivalDisplay, primarySource, rivalSource, primaryObservedAt, rivalObservedAt, reasons, reasonList, sharedTerms, contradictions, verdict, verdictSame, verdictLabel, fullAction, shortAction, actionRationale, actionSource, actionModel, actionPromptVersion, actionEvidenceKeys, priceClaim, priceStatus, priceSignal, priceDetail, lane, claimType, confidence, matchStatus, evidence, confidenceLabel, diff, diffBasis, diffTone, difference, method, rivalPriceMissing } as const;
}

export function ProductIdentity({ role, product, price, source, domain, ar, compact = false, showPrice = true }: { role: "you" | "rival"; product: Record<string, unknown>; price: string; source: string; domain?: string; ar: boolean; compact?: boolean; showPrice?: boolean }) {
  const name = display(product.name, role === "you" ? (ar ? "منتج مرصود" : "Observed product") : (ar ? "منتج منافس مرصود" : "Observed rival product"));
  const image = safeUrl(product.imageUrl);
  return <article className={`rp-product${compact ? " is-compact" : ""}`}>
    <Thumb image={image} ar={ar} />
    <span><span className="rp-product-name" dir="auto">{name}</span><span className="rp-product-sub">{role === "you" ? (ar ? "أنت" : "You") : domain || (ar ? "المنافس" : "Rival")}{showPrice && <> · <span className="rp-price">{price || unpricedCatalogLabel(product, ar)}</span></>}</span>{source && <a className="rp-product-sub" href={source} target="_blank" rel="noreferrer" title={ar ? "افتح المنتج ↗" : "Open product ↗"}>{urlPath(source)} ↗</a>}</span>
  </article>;
}

function Thumb({ image, size = "", ar }: { image: string; size?: "" | "ds-thumb-md" | "ds-thumb-lg"; ar: boolean }) {
  return <span className={`ds-thumb ${size}${image ? "" : " ds-thumb-none"}`} aria-hidden="true">{image ? <img src={image} alt="" loading="lazy" /> : (ar ? "لا صورة" : "No image")}</span>;
}

function Price({ value, ar, className = "" }: { value: string; ar: boolean; className?: string }) {
  return value ? <span className={`rp-price ${className}`}>{value}</span> : <span className={`rp-price is-na ${className}`}>{ar ? "غير مرصود" : "Not observed"}</span>;
}

function Diff({ row, inline = false }: { row: ProductRow; inline?: boolean }) {
  return inline
    ? <p className={`rp-matchup-diff rp-diff is-${row.diffTone}`}>{row.diff} <small>· {row.diffBasis}</small></p>
    : <span className={`rp-diff is-${row.diffTone}`}><span>{row.diff}</span><small>{row.diffBasis}</small></span>;
}

function NextMove({ row, ar, inline = false }: { row: ProductRow; ar: boolean; inline?: boolean }) {
  const source = <span className={`rp-next-source${row.actionSource === "ai" ? " is-ai" : ""}`}>{row.actionSource === "ai" ? (ar ? "مسودة AI" : "AI-drafted") : (ar ? "قاعدة" : "Rule-based")}</span>;
  return inline
    ? <p className="rp-inline-next">→ {row.shortAction} {source}</p>
    : <span className="rp-next"><span>{row.shortAction}</span>{source}</span>;
}

function ExpandButton({ open, onToggle, ar, size = "" }: { open: boolean; onToggle: () => void; ar: boolean; size?: string }) {
  return <button type="button" className={`ds-btn-icon ${size}`} aria-expanded={open} aria-label={ar ? "لماذا هذه المطابقة؟" : "Why this match?"} title={ar ? "لماذا هذه المطابقة؟" : "Why this match?"} onClick={onToggle}>{open ? "▴" : "▾"}</button>;
}

function ProductTableDifference({ claim, lane, ar }: { claim: PriceClaim; lane: ReturnType<typeof formatPriceClaim>["lane"]; ar: boolean }) {
  const difference = formatPriceDifference(claim, ar ? "ar" : "en");
  return <p className={`rp-method rp-difference is-${lane}`}><small>{difference.label}</small> <span className="rp-price">{difference.value}</span> · {difference.direction} · <small>{difference.note}</small></p>;
}

function ProductTableDetails({ row, ar, anchor, viewKey, watchControls }: { row: ProductRow; ar: boolean; anchor: string; viewKey: ProductView; watchControls?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const manual = useRef<HTMLDialogElement>(null);
  const [manualLink, setManualLink] = useState("");
  const copyLink = async () => {
    const url = new URL(window.location.href); url.searchParams.set("view", "products"); url.searchParams.set("layout", viewKey); url.hash = anchor;
    try { await navigator.clipboard.writeText(url.toString()); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setManualLink(url.toString()); manual.current?.showModal(); }
  };
  const source = row.actionSource === "ai" ? `${ar ? "ذكاء اصطناعي مقيّد بالأدلة" : "Evidence-grounded AI"}${row.actionModel ? ` · ${row.actionModel}` : ""}${row.actionPromptVersion ? ` · ${row.actionPromptVersion}` : ""}` : (ar ? "قواعد حتمية" : "Deterministic rules");
  return <div className="rp-drawer">
    <div>
      <p className="ds-label ds-kicker-accent">{ar ? "لماذا هذه المطابقة؟" : "Why this match?"}</p>
      {row.reasonList.length || row.sharedTerms.length
        ? <ul>{(row.reasonList.length ? row.reasonList : [`${ar ? "مصطلحات مشتركة" : "Shared terms"}: ${row.sharedTerms.join(", ")}`]).map((reason, index) => <li key={index}>{reason}</li>)}</ul>
        : <p>{ar ? "لم تُحفظ أسباب إضافية." : "No additional match reasons were saved."}</p>}
      {row.contradictions.length > 0 && <p className="rp-contra"><b>{ar ? "تناقض" : "Contradiction"}:</b> {row.contradictions.join(" · ")}</p>}
      <p className="rp-method">{ar ? "الطريقة" : "Method"} · {row.method || (ar ? "غير مسجلة" : "not recorded")} · {ar ? "الثقة" : "Confidence"} {row.confidenceLabel} · {evidenceStateLabel(row.evidence, ar)} · {row.verdictLabel}</p>
      <p className="rp-rationale"><b>{ar ? "الخطوة المقترحة" : "Suggested next move"}:</b> <span>{row.fullAction}</span></p>
      {row.actionRationale && <p className="rp-rationale"><b>{ar ? "سبب الخطوة" : "Action rationale"}:</b> {row.actionRationale}</p>}
      <p className="rp-method">{ar ? "مصدر التوصية" : "Recommendation source"} · {source}{row.actionEvidenceKeys.length > 0 && <> · {ar ? "الأدلة المستخدمة" : "Evidence used"}: {row.actionEvidenceKeys.join(", ")}</>}</p>
    </div>
    <div>
      <p className="ds-label">{ar ? "أساس السعر" : "Price basis"}</p>
      <p>{row.priceSignal}</p>
      <p className="rp-method">{row.priceDetail}</p>
      <ProductTableDifference claim={row.priceClaim} lane={row.lane} ar={ar} />
    </div>
    <div>
      <p className="ds-label">{ar ? "المصادر" : "Sources"}</p>
      <ProductIdentity role="you" product={row.battle.primary} price={row.primaryDisplay} source={row.primarySource} ar={ar} compact />
      <ProductIdentity role="rival" product={row.battle.rival} price={row.rivalDisplay} source={row.rivalSource} domain={row.domain} ar={ar} compact />
      <p className="rp-observed">{ar ? "رُصد" : "Observed"} · {ar ? "منتجك" : "you"} <time dateTime={row.primaryObservedAt}>{observedDate(row.primaryObservedAt, ar)}</time> · {ar ? "المنافس" : "rival"} <time dateTime={row.rivalObservedAt}>{observedDate(row.rivalObservedAt, ar)}</time></p>
      <button type="button" className="rp-copy" onClick={() => void copyLink()}>{copied ? (ar ? "تم نسخ الرابط" : "Link copied") : (ar ? "نسخ الرابط" : "Copy deep link")}</button>
      <dialog className="signal-drawer" ref={manual} aria-label={ar ? "انسخ الرابط يدوياً" : "Copy link manually"}><div className="signal-drawer-content" dir={ar ? "rtl" : "ltr"}><header><h2>{ar ? "انسخ الرابط يدوياً" : "Copy link manually"}</h2><button type="button" autoFocus onClick={() => manual.current?.close()}>{ar ? "إغلاق" : "Close"}</button></header><p>{ar ? "المشاركة غير متاحة هنا — انسخ الرابط من الحقل." : "Sharing is not available here — copy the link from the field."}</p><input className="ds-input ds-input-white" value={manualLink} readOnly dir="ltr" onFocus={(event) => event.currentTarget.select()} aria-label={ar ? "رابط عميق" : "Deep link"} /></div></dialog>
    </div>
    {watchControls && <div className="rp-drawer-watch">{watchControls}</div>}
  </div>;
}

type MatchPagePayload = { ok: boolean; error?: string; errorCode?: string; page?: { authoritative: true; manifestHash: string; totalCount: number; directPriceCount: number; domainCounts: Record<string, number>; items: ProductBattle[]; nextCursor: string | null } };
type WatchCadence = "hourly" | "daily";
type ReportWatcher = { id: string; cadence: WatchCadence; state: string; links: Array<{ publicReportId: string; matchId: string }> };

function PriceWatchSwitch({ checked, disabled, busy, label, ar, onToggle }: { checked: boolean; disabled: boolean; busy: boolean; label: string; ar: boolean; onToggle: () => void }) {
  return <button
    type="button"
    className="watch-switch"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onToggle}
  ><span aria-hidden="true" /><b>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : checked ? (ar ? "مفعّل" : "On") : (ar ? "متوقف" : "Off")}</b></button>;
}

async function fetchMatchPageFrom(matchesEndpoint: string, cursor?: string, limit = PAGE_SIZE) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`${matchesEndpoint}?${query}`, { cache: "no-store", headers: { accept: "application/json" } });
  const body = await readJsonResponse<MatchPagePayload>(response, "Saved report matches");
  if (!response.ok || !body.ok || !body.page?.authoritative) throw Object.assign(new Error(body.error || "The complete saved matches are unavailable."), { fallback: body.errorCode === "facts-unavailable" || response.status === 409 });
  return body.page;
}

/** Builds and downloads the comparison CSV from every saved match (falls back to the compact snapshot). */
export async function exportReportCsv({ matchesEndpoint, battles, primaryDomain, ar }: { matchesEndpoint: string; battles: ProductBattle[]; primaryDomain: string; ar: boolean }) {
  let exportBattles: ProductBattle[] = [];
  try {
    let cursor: string | null | undefined = undefined;
    do {
      const page = await fetchMatchPageFrom(matchesEndpoint, cursor || undefined, 100);
      exportBattles = [...exportBattles, ...page.items]; cursor = page.nextCursor;
    } while (cursor);
  } catch (cause) {
    if (!(cause as { fallback?: boolean }).fallback) throw cause;
    exportBattles = battles;
  }
  const exportRows = exportBattles.map((battle) => prepareRow(battle, ar));
  const headers = ["your_product", "your_price_raw", "your_price_amount", "your_currency", "rival_domain", "rival_product", "rival_price_raw", "rival_price_amount", "rival_currency", "price_status", "price_signal", "suggested_action", "suggested_action_source", "match_status", "confidence", "your_observed_at", "rival_observed_at", "your_source", "rival_source"];
  const data = exportRows.map((row) => [display(row.battle.primary.name), row.primaryDisplay, row.priceClaim.primary?.amount ?? "", row.priceClaim.primary?.currency ?? "", row.domain, display(row.battle.rival.name), row.rivalDisplay, row.priceClaim.rival?.amount ?? "", row.priceClaim.rival?.currency ?? "", row.priceStatus, row.priceSignal, row.fullAction, row.actionSource, `${row.matchStatus}-${row.claimType}`, row.confidence, row.primaryObservedAt, row.rivalObservedAt, row.primarySource, row.rivalSource]);
  const csv = `\uFEFF${[headers, ...data].map((line) => line.map(csvCell).join(",")).join("\r\n")}`;
  const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = href; anchor.download = `${slug(primaryDomain)}-product-comparison.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(href), 0);
}

function money(claim: PriceClaim, side: "primary" | "rival") { const parsed = claim[side]; return parsed && Number.isFinite(parsed.amount) ? { amount: parsed.amount, currency: parsed.currency } : null; }

export function ProductDesignLab({ comparison, battles, primaryProducts, publicId, matchesEndpoint, workspaceMode, authoritativeMatchTotal, onAuthoritativeSummary, primaryDomain, ar, view, onViewChange, competitorFilter, onCompetitorFilterChange, competitorCounts }: ProductDesignLabProps) {
  const [authoritativeBattles, setAuthoritativeBattles] = useState<ProductBattle[] | null>(null);
  const [matchTotal, setMatchTotal] = useState(authoritativeMatchTotal || battles.length);
  const [domainCounts, setDomainCounts] = useState<Record<string, number> | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [matchLoadState, setMatchLoadState] = useState<"loading" | "ready" | "fallback" | "more">("loading");
  const [matchLoadMessage, setMatchLoadMessage] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [watchers, setWatchers] = useState<ReportWatcher[]>([]);
  const [watchAvailable, setWatchAvailable] = useState(false);
  const [watchCadences, setWatchCadences] = useState<Record<string, WatchCadence>>({});
  const [watchBusy, setWatchBusy] = useState("");
  const [watchMessage, setWatchMessage] = useState("");
  const watcherRefreshVersion = useRef(0);
  const activeReportId = useRef(publicId);
  const displayedBattles = authoritativeBattles ?? battles;
  const rows = useMemo(() => displayedBattles.map((battle) => prepareRow(battle, ar)), [displayedBattles, ar]);
  const catalogProducts = primaryProducts?.authoritative ? primaryProducts.products : [];
  const comparedProducts = numeric(object(comparison?.matching).publishedPrimaryProducts) || list(comparison?.rows).length;
  const publication = object(object(comparison?.matching).publication);
  const excludedPriceMatches = numeric(publication.suppressedAcceptedPairs);
  const suppressionReasons = Object.entries(object(publication.reasons))
    .map(([reason, count]) => [reason, numeric(count)] as const)
    .filter(([, count]) => count > 0);
  const suppressionSummary = suppressionReasons.map(([reason, count]) => suppressionReasonLabel(reason, count, ar)).join(ar ? "، " : "; ");
  const itemWatchReady = workspaceMode && watchAvailable && authoritativeBattles !== null;

  const refreshWatchers = useCallback(async (signal?: AbortSignal) => {
    const refreshVersion = ++watcherRefreshVersion.current;
    const response = await fetch("/api/price-watch", { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" }, signal });
    const body = await response.json().catch(() => ({})) as { ok?: boolean; watchers?: ReportWatcher[] };
    if (signal?.aborted || refreshVersion !== watcherRefreshVersion.current) return;
    if (!response.ok || !body.ok) { setWatchAvailable(false); return; }
    setWatchers(Array.isArray(body.watchers) ? body.watchers : []);
    setWatchAvailable(true);
  }, []);

  useEffect(() => {
    if (!workspaceMode) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void refreshWatchers(controller.signal).catch(() => { /* The unavailable state is already the safe default. */ });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [publicId, refreshWatchers, workspaceMode]);

  const watcherForMatch = (matchId: string) => watchers.find((watcher) => watcher.links.some((link) => link.publicReportId === publicId && link.matchId === matchId));
  const selectedCadence = (matchId: string, watcher?: ReportWatcher) => watchCadences[matchId] || watcher?.cadence || "daily";
  const isRunningWatcher = (watcher?: ReportWatcher) => watcher?.state === "active" || watcher?.state === "baseline_pending";
  const clearCadenceOverride = (matchId: string) => setWatchCadences((current) => {
    if (!(matchId in current)) return current;
    const next = { ...current };
    delete next[matchId];
    return next;
  });

  async function watcherRequest(path: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    const response = await fetch(path, { method, credentials: "same-origin", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error || "The price watcher could not be updated.");
  }

  async function toggleMatchWatch(matchId: string, enable: boolean) {
    if (!/^[a-f0-9]{64}$/.test(matchId)) return;
    const watcher = watcherForMatch(matchId);
    const cadence = selectedCadence(matchId, watcher);
    setWatchBusy(matchId);
    setWatchMessage("");
    try {
      if (enable && !watcher) await watcherRequest("/api/price-watch", "POST", { publicReportId: publicId, matchId, cadence });
      else if (enable && watcher) await watcherRequest(`/api/price-watch/${watcher.id}`, "PATCH", { action: "resume", cadence });
      else if (watcher) await watcherRequest(`/api/price-watch/${watcher.id}`, "PATCH", { action: "disable" });
      await refreshWatchers();
      clearCadenceOverride(matchId);
    } catch (cause) {
      setWatchMessage(cause instanceof Error ? cause.message : "The watcher could not be updated.");
    } finally {
      setWatchBusy("");
    }
  }

  async function changeMatchCadence(matchId: string, cadence: WatchCadence) {
    setWatchCadences((current) => ({ ...current, [matchId]: cadence }));
    const watcher = watcherForMatch(matchId);
    if (!watcher) return;
    setWatchBusy(matchId);
    setWatchMessage("");
    try {
      await watcherRequest(`/api/price-watch/${watcher.id}`, "PATCH", { cadence });
      await refreshWatchers();
      clearCadenceOverride(matchId);
    } catch (cause) {
      clearCadenceOverride(matchId);
      setWatchMessage(cause instanceof Error ? cause.message : "The frequency could not be updated.");
    } finally {
      setWatchBusy("");
    }
  }

  const fetchMatchPage = async (cursor?: string) => {
    const page = await fetchMatchPageFrom(matchesEndpoint, cursor);
    if (activeReportId.current !== publicId) throw new DOMException("Report changed", "AbortError");
    return page;
  };

  const [reloadVersion, setReloadVersion] = useState(0);
  const retryFullResult = () => { setMatchLoadState("loading"); setMatchLoadMessage(""); setReloadVersion((current) => current + 1); };

  useEffect(() => {
    activeReportId.current = publicId;
    let current = true;
    fetchMatchPageFrom(matchesEndpoint).then((page) => {
      if (!current || activeReportId.current !== publicId) return;
      setAuthoritativeBattles(page.items); setMatchTotal(page.totalCount); setDomainCounts(page.domainCounts || {}); setNextCursor(page.nextCursor); setMatchLoadState("ready"); onAuthoritativeSummary?.({ totalCount: page.totalCount, domainCounts: page.domainCounts || {} });
    }).catch((cause) => {
      if (!current) return;
      setMatchLoadState("fallback"); setMatchLoadMessage(jsonResponseErrorMessage(cause, "The compact saved comparison remains available."));
    });
    return () => { current = false; if (activeReportId.current === publicId) activeReportId.current = ""; };
  // The public report id identifies an immutable completed fact manifest; reloadVersion re-runs the fetch on demand.
  }, [matchesEndpoint, publicId, onAuthoritativeSummary, reloadVersion]);

  const rowAnchor = (row: ProductRow, index: number) => rows.findIndex((candidate) => candidate.domain === row.domain) === index ? `rival-${slug(row.domain)}` : `rival-${slug(row.domain)}-${slug(row.battle.key)}`;

  const loadMoreMatches = async () => {
    if (!nextCursor || matchLoadState === "more") return;
    setMatchLoadState("more"); setMatchLoadMessage("");
    try {
      const page = await fetchMatchPage(nextCursor);
      setAuthoritativeBattles((current) => [...(current || []), ...page.items]); setNextCursor(page.nextCursor); setMatchTotal(page.totalCount); setDomainCounts(page.domainCounts || {}); setMatchLoadState("ready");
    } catch (cause) {
      setMatchLoadState("ready"); setMatchLoadMessage(jsonResponseErrorMessage(cause, "More saved matches could not be loaded."));
    }
  };

  const counts = domainCounts || competitorCounts || null;
  const domains = useMemo(() => {
    const merged = new Map<string, number>();
    rows.forEach((row) => merged.set(row.domain, (merged.get(row.domain) || 0) + 1));
    if (counts) Object.entries(counts).forEach(([domain, count]) => { if (domain) merged.set(domain, Math.max(merged.get(domain) || 0, numeric(count))); });
    return [...merged.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  }, [rows, counts]);
  const filtered = useMemo(() => competitorFilter ? rows.filter((row) => row.domain === competitorFilter) : rows, [rows, competitorFilter]);
  const shownTotal = competitorFilter ? Math.max(filtered.length, numeric(counts?.[competitorFilter])) : (authoritativeBattles ? matchTotal : rows.length);
  const toggleOpen = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));

  const watchControlsFor = (row: ProductRow) => {
    if (!itemWatchReady) return undefined;
    const matchId = row.battle.key;
    const watcher = watcherForMatch(matchId);
    const running = isRunningWatcher(watcher);
    const cadence = selectedCadence(matchId, watcher);
    const eligible = /^[a-f0-9]{64}$/.test(matchId);
    const busy = watchBusy === matchId;
    const rivalName = display(row.battle.rival.name, ar ? "منتج المنافس" : "Rival product");
    const primaryName = display(row.battle.primary.name, ar ? "منتجك" : "Your product");
    return <section className="research-item-watch" aria-label={ar ? "مراقبة سعر المنتج" : "Item price watch"}>
      <div><h3>{ar ? "راقب هذا المنتج" : "Watch this item"}</h3><p>{ar ? "رصيد واحد لكل فحص. المراقبة اختيارية." : "One credit per check. Monitoring is opt-in."}</p></div>
      <div className="row-watch-control"><PriceWatchSwitch checked={running} disabled={!eligible || busy} busy={busy} label={ar ? `مراقبة سعر ${rivalName} المطابق لـ ${primaryName}` : `Watch the price of ${rivalName}, matched to ${primaryName}`} ar={ar} onToggle={() => void toggleMatchWatch(matchId, !running)} />
        <select aria-label={ar ? `تكرار مراقبة سعر ${rivalName}` : `Price-watch frequency for ${rivalName}`} value={cadence} disabled={!eligible || busy} onChange={(event) => void changeMatchCadence(matchId, event.target.value as WatchCadence)}><option value="daily">{ar ? "يومي" : "Daily"}</option><option value="hourly">{ar ? "كل ساعة" : "Hourly"}</option></select>
        {watcher && !running && <small>{watcher.state.replace(/_/g, " ")}</small>}
      </div>{watchMessage && <p className="report-watch-message" role="status">{watchMessage}</p>}
    </section>;
  };

  const groups = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    filtered.forEach((row) => { const key = row.primarySource || display(row.battle.primary.id) || row.battle.key; map.set(key, [...(map.get(key) || []), row]); });
    return [...map.entries()].map(([key, items]) => {
      const first = items[0];
      const mine = money(first.priceClaim, "primary");
      const comparable = items.filter((item) => (item.priceClaim.kind === "direct") && money(item.priceClaim, "rival") && mine && money(item.priceClaim, "rival")!.currency === mine.currency);
      const rank = mine ? comparable.filter((item) => money(item.priceClaim, "rival")!.amount < mine.amount).length + 1 : 0;
      const lowest = comparable.length ? comparable.reduce((a, b) => money(a.priceClaim, "rival")!.amount < money(b.priceClaim, "rival")!.amount ? a : b) : null;
      const summary = lowest && mine
        ? `${ar ? "بين الأسعار المرصودة القابلة للمقارنة" : "Among observed comparable prices"}: ${rank} ${ar ? "من" : "of"} ${comparable.length + 1} · ${ar ? "الأدنى المرصود" : "lowest observed"} ${lowest.rivalDisplay} (${lowest.domain})`
        : (ar ? "لا سعر مرصود قابل للمقارنة بعد" : "No comparable observed price yet");
      return { key, first, items, summary };
    }).sort((left, right) => right.items.length - left.items.length);
  }, [filtered, ar]);

  const opportunityGroups = [
    { key: "rival", title: ar ? "المنافس أقل سعراً" : "Rival is cheaper", hint: ar ? "راجع السعر أو القيمة" : "review price or value", items: filtered.filter((row) => row.diffTone === "rival") },
    { key: "you", title: ar ? "أنت أقل سعراً" : "You are cheaper", hint: ar ? "احمِ الريادة" : "protect the lead", items: filtered.filter((row) => row.diffTone === "you") },
    { key: "evidence", title: ar ? "يحتاج دليلاً / غير مرصود" : "Needs evidence or not observed", hint: ar ? "أعد الفحص" : "recheck before acting", items: filtered.filter((row) => row.diffTone === "evidence" || row.diffTone === "equal") },
  ];

  const viewLabels: Record<ProductView, string> = { byproduct: ar ? "حسب المنتج" : "By product", table: ar ? "جدول" : "Table", matchups: ar ? "مقابلات" : "Matchups", opportunities: ar ? "فرص" : "Opportunities" };
  const rivalCell = (row: ProductRow, size: "" | "ds-thumb-md" | "ds-thumb-lg" = "") => <span className="rp-product rp-cell-rival"><Thumb image={safeUrl(row.battle.rival.imageUrl)} size={size} ar={ar} /><span><span className="rp-product-name" dir="auto">{display(row.battle.rival.name, ar ? "منتج المنافس" : "Rival product")}</span>{row.rivalSource ? <a className="rp-product-sub" href={row.rivalSource} target="_blank" rel="noreferrer">{row.domain}</a> : <span className="rp-product-sub">{row.domain}</span>}</span></span>;
  const youCell = (row: ProductRow, size: "" | "ds-thumb-md" | "ds-thumb-lg" = "") => <span className="rp-product rp-cell-you"><Thumb image={safeUrl(row.battle.primary.imageUrl)} size={size} ar={ar} /><span><span className="rp-product-name" dir="auto">{display(row.battle.primary.name, ar ? "منتجك" : "Your product")}</span>{row.primarySource ? <a className="rp-product-sub" href={row.primarySource} target="_blank" rel="noreferrer">{urlPath(row.primarySource)}</a> : <span className="rp-product-sub">{primaryDomain}</span>}</span></span>;
  const evidenceCell = (row: ProductRow) => <EvidenceTag state={row.evidence} label={evidenceStateLabel(row.evidence, ar)} small />;

  return <section className="rp-products" aria-label={ar ? "مقارنات المنتجات" : "Product comparisons"}>
    {matchLoadState === "fallback" && <div className="rp-notice is-inferred" role="status"><span className="ds-label">◐ {ar ? "لقطة مضغوطة" : "Compact snapshot"}</span><span>{ar ? "نعرض اللقطة المحفوظة المضغوطة؛ تعذر تحميل النتيجة الكاملة." : "Showing the compact saved snapshot; the full result could not be loaded."}{matchLoadMessage ? ` ${matchLoadMessage}` : ""}</span><a href="#retry" onClick={(event) => { event.preventDefault(); retryFullResult(); }}>{ar ? "أعد محاولة تحميل النتيجة الكاملة" : "Retry loading full result"}</a></div>}
    {excludedPriceMatches > 0 && <div className="rp-notice" role="note"><span className="ds-label">◔ {ar ? "مطابقات مستبعدة من جدول الأسعار" : "Matches kept out of the price table"}</span><span>{suppressionSummary
      ? (ar ? `تم الاحتفاظ بأدلة ${excludedPriceMatches} مطابقة أخرى واستبعادها من جدول الأسعار: ${suppressionSummary}.` : `${excludedPriceMatches} additional semantic matches were preserved as evidence and excluded from the price table: ${suppressionSummary}.`)
      : (ar ? `تم الاحتفاظ بأدلة ${excludedPriceMatches} مطابقة أخرى واستبعادها من جدول الأسعار وفق قواعد سلامة النشر.` : `${excludedPriceMatches} additional semantic matches were preserved as evidence and excluded under the publication integrity rules.`)}</span></div>}

    <div className="rp-toolbar">
      <div className="ds-seg" role="group" aria-label={ar ? "طريقة العرض" : "View"}>
        {PRODUCT_VIEWS.map((key, index) => <button key={key} type="button" aria-pressed={view === key} onClick={() => onViewChange(key)} onKeyDown={(event) => {
          const next = productLayoutKeyIndex(event.key, index, ar);
          if (next === null) return;
          event.preventDefault();
          event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
          onViewChange(PRODUCT_VIEWS[next]);
        }}>{viewLabels[key]}</button>)}
      </div>
      <div className="rp-filter" role="group" aria-label={ar ? "المنافس" : "Competitor"}>
        <span className="ds-small">{ar ? "المنافس" : "Competitor"}</span>
        <button type="button" className="ds-chip" aria-pressed={!competitorFilter} onClick={() => onCompetitorFilterChange("")}><span>{ar ? "الكل" : "All"}</span><small>{authoritativeBattles ? matchTotal : rows.length}</small></button>
        {domains.map(([domain, count]) => <button key={domain} type="button" className="ds-chip" aria-pressed={competitorFilter === domain} onClick={() => onCompetitorFilterChange(competitorFilter === domain ? "" : domain)}><span dir="ltr">{domain}</span><small>{count}</small></button>)}
      </div>
      <span className="ds-spacer" />
      <span className="rp-shown" role="status" aria-live="polite">{matchLoadState === "loading" ? (ar ? "جارٍ تحميل المطابقات المحفوظة…" : "Loading saved matches…") : `${filtered.length} ${ar ? "من" : "of"} ${shownTotal} ${ar ? "مقارنات مقبولة" : "accepted comparisons"}`}</span>
    </div>

    {!filtered.length && matchLoadState !== "loading" && <div className="rp-states">
      <EdgeStateCard where={ar ? "المنتجات" : "Products"} state="limited" stateLabel={ar ? "محدود" : "Limited"} title={competitorFilter ? (ar ? "لا مطابقات محملة لهذا المنافس" : "No loaded matches for this competitor") : (ar ? "لا مطابقات منتجات مقبولة" : "No accepted product matches")}
        body={competitorFilter
          ? (ar ? `لم تُحمَّل بعد مطابقات من ${competitorFilter}. حمّل المزيد أو أزل التصفية.` : `No matches from ${competitorFilter} are loaded yet. Load more rows or clear the filter.`)
          : (ar ? `فُهرست المنتجات على الجانبين (${primaryProducts?.totalCount || comparedProducts} من منتجاتك مرصودة)، لكن لا زوج بلغ عتبة المطابقة. هذا ليس "صفر منتجات".` : `Products were catalogued for both sides (${primaryProducts?.totalCount || comparedProducts} of your products observed), but no pair met the match threshold. "None" is not "zero products".`)}
        actions={competitorFilter ? <button type="button" onClick={() => onCompetitorFilterChange("")}>{ar ? "أزل التصفية" : "Clear filter"}</button> : <><a href="?view=competitors">{ar ? "اعرض المنافسين الموثقين" : "View verified competitors"}</a><ActionSeparator /><Link href="/">{ar ? "خفّف إلى البدائل بتشغيل جديد" : "Loosen to substitutes with a new run"}</Link></>} />
    </div>}

    {view === "table" && filtered.length > 0 && <div className="rp-table">
      <div role="row" className="rp-thead"><span>{ar ? "منتجك" : "Your product"}</span><span>{ar ? "سعرك" : "Your price"}</span><span>{ar ? "منتج المنافس" : "Rival product"}</span><span>{ar ? "سعر المنافس" : "Rival price"}</span><span>{ar ? "المطابقة" : "Match"}</span><span>{ar ? "فرق السعر" : "Price difference"}</span><span>{ar ? "الدليل" : "Evidence"}</span><span>{ar ? "الخطوة التالية" : "Next move"}</span><span /></div>
      {filtered.map((row) => {
        const key = row.battle.key; const anchor = rowAnchor(row, rows.indexOf(row)); const isOpen = Boolean(open[key]);
        return <div className="rp-tgroup" id={rowAnchor(row, rows.indexOf(row))} key={key}>
          <div role="row" className={`rp-trow research-comparison-row${isOpen ? " is-open" : ""}`}>
            {youCell(row)}
            <span className="rp-cell"><span className="rp-cell-label">{ar ? "سعرك" : "Your price"}</span><Price value={row.primaryDisplay} ar={ar} /></span>
            {rivalCell(row)}
            <span className="rp-cell"><span className="rp-cell-label">{ar ? "سعر المنافس" : "Rival price"}</span><Price value={row.rivalDisplay} ar={ar} /></span>
            <span className="rp-cell"><span className="rp-cell-label">{ar ? "المطابقة" : "Match"}</span><VerdictMark same={row.verdictSame} label={row.verdictLabel} /></span>
            <span className="rp-cell"><span className="rp-cell-label">{ar ? "فرق السعر" : "Price difference"}</span><Diff row={row} /></span>
            <span className="rp-cell"><span className="rp-cell-label">{ar ? "الدليل" : "Evidence"}</span>{evidenceCell(row)}<span className="rp-conf">{row.confidenceLabel}</span></span>
            <span className="rp-cell rp-cell-next"><span className="rp-cell-label">{ar ? "الخطوة التالية" : "Next move"}</span><NextMove row={row} ar={ar} /></span>
            <span className="rp-cell-icon"><ExpandButton open={isOpen} onToggle={() => toggleOpen(key)} ar={ar} /></span>
          </div>
          {isOpen && <ProductTableDetails row={row} ar={ar} anchor={anchor} viewKey={view} watchControls={watchControlsFor(row)} />}
        </div>;
      })}
    </div>}

    {view === "byproduct" && filtered.length > 0 && <div className="rp-groups research-product-groups">
      {groups.map((entry) => {
        const group = entry.items; const first = entry.first; const image = safeUrl(first.battle.primary.imageUrl);
        return <section className="rp-group" key={entry.key} id={rowAnchor(first, rows.indexOf(first))}>
          <div className="rp-group-you">
            <p className="ds-label">{ar ? "أنت" : "You"}</p>
            <Thumb image={image} size="ds-thumb-lg" ar={ar} />
            <div><p className="rp-group-name" dir="auto">{display(first.battle.primary.name, ar ? "منتجك" : "Your product")}</p><p className="rp-group-sub">{first.primarySource ? <a href={first.primarySource} target="_blank" rel="noreferrer">{urlPath(first.primarySource)} ↗</a> : primaryDomain}</p></div>
            {first.primaryDisplay ? <p className="rp-group-price">{first.primaryDisplay}</p> : <p className="rp-group-price is-na">{ar ? "غير مرصود" : "Not observed"}</p>}
            <p className="rp-group-count"><b>{group.length} {group.length === 1 ? (ar ? "منافس" : "rival") : (ar ? "منافسين" : "rivals")}</b></p>
            <p className="rp-group-summary">{entry.summary}</p>
          </div>
          <div className="rp-group-items">
            {group.map((row) => {
              const key = row.battle.key; const anchor = first === row ? `${rowAnchor(row, rows.indexOf(row))}-match` : rowAnchor(row, rows.indexOf(row)); const isOpen = Boolean(open[key]);
              return <article className={`rp-item${isOpen ? " is-open" : ""}`} key={key} id={anchor}>
                <div className="rp-item-head"><Thumb image={safeUrl(row.battle.rival.imageUrl)} size="ds-thumb-md" ar={ar} /><div><p dir="auto">{display(row.battle.rival.name, ar ? "منتج المنافس" : "Rival product")}</p>{row.rivalSource ? <a className="rp-product-sub" href={row.rivalSource} target="_blank" rel="noreferrer">{row.domain}</a> : <span className="rp-product-sub">{row.domain}</span>}</div><ExpandButton open={isOpen} onToggle={() => toggleOpen(key)} ar={ar} /></div>
                <div className="rp-item-price"><Price value={row.rivalDisplay} ar={ar} /><VerdictMark same={row.verdictSame} label={row.verdictLabel} /></div>
                <Diff row={row} />
                <div className="rp-item-foot">{evidenceCell(row)}<span className="rp-conf">{row.confidenceLabel}</span></div>
                <NextMove row={row} ar={ar} inline />
                {isOpen && <div className="rp-item-drawer"><ProductTableDetails row={row} ar={ar} anchor={anchor} viewKey={view} watchControls={watchControlsFor(row)} /></div>}
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>}

    {view === "matchups" && filtered.length > 0 && <div className="rp-matchups">
      {filtered.map((row) => {
        const key = row.battle.key; const anchor = rowAnchor(row, rows.indexOf(row)); const isOpen = Boolean(open[key]);
        return <article className="rp-matchup" key={key} id={anchor}>
          <div className="rp-matchup-head"><VerdictMark same={row.verdictSame} label={row.verdictLabel} /><EvidenceTag state={row.evidence} label={<>{evidenceStateLabel(row.evidence, ar)} · {row.confidenceLabel}</>} small /></div>
          <div className="rp-matchup-pair">
            <div><Thumb image={safeUrl(row.battle.primary.imageUrl)} size="ds-thumb-lg" ar={ar} /><p className="ds-label is-you">{ar ? "أنت" : "You"}</p><p className="rp-matchup-name" dir="auto">{display(row.battle.primary.name, ar ? "منتجك" : "Your product")}</p><Price value={row.primaryDisplay} ar={ar} /></div>
            <span className="rp-matchup-vs">vs</span>
            <div><Thumb image={safeUrl(row.battle.rival.imageUrl)} size="ds-thumb-lg" ar={ar} /><p className="ds-label" dir="ltr">{row.domain}</p><p className="rp-matchup-name" dir="auto">{display(row.battle.rival.name, ar ? "منتج المنافس" : "Rival product")}</p><Price value={row.rivalDisplay} ar={ar} /></div>
          </div>
          <Diff row={row} inline />
          <div className="rp-matchup-foot"><NextMove row={row} ar={ar} inline /><ExpandButton open={isOpen} onToggle={() => toggleOpen(key)} ar={ar} /></div>
          {isOpen && <ProductTableDetails row={row} ar={ar} anchor={anchor} viewKey={view} watchControls={watchControlsFor(row)} />}
        </article>;
      })}
    </div>}

    {view === "opportunities" && filtered.length > 0 && <div className="rp-opps">
      {opportunityGroups.map((group) => <section className="rp-opp" key={group.key}>
        <div className="rp-opp-head"><h3>{group.title}</h3><span>{group.items.length} {ar ? "مطابقات" : "matches"} · {group.hint}</span></div>
        {group.items.length
          ? <ul>{group.items.map((row) => <li key={row.battle.key}><span><a href={`?view=products&layout=matchups#${rowAnchor(row, rows.indexOf(row))}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onViewChange("matchups"); window.requestAnimationFrame(() => document.getElementById(rowAnchor(row, rows.indexOf(row)))?.scrollIntoView({ block: "start" })); }}><span dir="auto">{display(row.battle.primary.name, ar ? "منتجك" : "Your product")}</span> <span className="rp-vs">vs</span> <span dir="auto">{display(row.battle.rival.name, ar ? "منتج المنافس" : "Rival product")}</span></a></span><span className={`rp-diff is-${row.diffTone}`}>{row.diff}</span>{evidenceCell(row)}</li>)}</ul>
          : <p className="rp-opp-empty">{ar ? "لا مطابقات محملة في هذه المجموعة." : "No loaded matches in this group."}</p>}
      </section>)}
    </div>}

    <div className="rp-products-foot">
      {authoritativeBattles && <button type="button" className="ds-btn" onClick={() => void loadMoreMatches()} disabled={!nextCursor || matchLoadState === "more"}>{matchLoadState === "more" ? (ar ? "جارٍ التحميل…" : "Loading…") : nextCursor ? (ar ? `حمّل ${Math.min(PAGE_SIZE, Math.max(1, matchTotal - rows.length))} أخرى` : `Load ${Math.min(PAGE_SIZE, Math.max(1, matchTotal - rows.length))} more`) : (ar ? `تم تحميل كل الـ ${matchTotal}` : `All ${matchTotal} loaded`)}</button>}
      <span>{authoritativeBattles ? (ar ? `تُحمَّل المطابقات المحفوظة في صفحات من ${PAGE_SIZE}.` : `Saved matches load in pages of ${PAGE_SIZE}.`) : (ar ? `نعرض لقطة مضغوطة من ${rows.length} مطابقة.` : `Showing a compact snapshot of ${rows.length} matches.`)} {rows.length} {ar ? "مقارنات محملة" : "loaded comparisons"} · {rows.filter((row) => row.priceClaim.kind === "direct").length} {ar ? "فروق أسعار معروضة" : "displayed price gaps"}.{matchLoadState !== "fallback" && matchLoadMessage && <> <span className="rp-load-error">{matchLoadMessage}</span></>}</span>
      <span className="ds-spacer" />
      <span>{ar ? "تُعرض الميزة المباشرة فقط عند تطابق الهوية والعملة والكمية والمتغير وأساس الفوترة." : "Direct advantage shown only when identity, currency, quantity, variant and billing basis agree."}</span>
    </div>

    {catalogProducts.length > 0 && <details className="ds-details rp-catalog"><summary><span>{ar ? "كتالوجك المحفوظ" : "Your saved catalog"}</span><b>{catalogProducts.length}{primaryProducts?.truncated ? ` / ${primaryProducts.totalCount}` : ""}</b></summary><p>{ar ? "يشمل الكتالوج روابط منتجات مكتشفة لم يتم التحقق من أسعارها. هذا ليس عدد صفحات المنتجات المفحوصة بالكامل. المقارنات أعلاه تتطلب أسعاراً صالحة." : "The catalog includes discovered product links whose prices have not been verified. This is not a count of fully inspected product pages. Comparisons above require usable prices."}</p><div className="rp-catalog-grid">{catalogProducts.map((product) => <article key={display(product.id)}><Thumb image={safeUrl(product.imageUrl)} ar={ar} /><div><p dir="auto">{display(product.name, ar ? "منتج مرصود" : "Observed product")}</p>{productPrice(product) ? <Price value={productPrice(product)} ar={ar} /> : <span className="rp-price is-na">{unpricedCatalogLabel(product, ar)}</span>}{safeUrl(product.sourceUrl) && <> · <a className="rp-product-sub" href={safeUrl(product.sourceUrl)} target="_blank" rel="noreferrer">{urlPath(safeUrl(product.sourceUrl))} ↗</a></>}</div></article>)}</div></details>}
  </section>;
}
