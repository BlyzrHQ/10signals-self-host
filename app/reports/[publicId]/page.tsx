"use client";

import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportReportCsv, prepareRow, ProductDesignLab, PRODUCT_VIEWS, type ProductView } from "../../components/product-design-lab";
import { ActionSeparator, EdgeStateCard, EvidenceLegend, EvidenceTag, evidenceStateLabel, NextMoves, ReportCrumbs, type NextMove } from "../../components/signal-overview";
import { CompetitorDirectory } from "../../components/competitor-directory";
import { ReportShareControl } from "../../components/report-share-control";
import { benchmarkDimensionCount, benchmarkNextMove, ExperienceBenchmark } from "../../components/experience-benchmark";
import { reportCoverage, type ReportCoverageEvent } from "../../lib/report-coverage";
import { jsonResponseErrorMessage, readJsonResponse } from "../../lib/json-response";
import { countLegacyUngatedProductMatches, publishedComparisonCompetitors } from "../../lib/report-price-publication";
import { stoppedReportPresentation } from "../../lib/stopped-report-presentation";

type Block = { type: string; id: string } & Record<string, unknown>;
type ReportEvent = ReportCoverageEvent;
type View = "overview" | "competitors" | "products" | "evidence";
type StoredPayload = { ok: boolean; error?: string; report?: { run: { publicId?: string; primaryDomain: string; locale: "en" | "ar"; status: string; createdAt: string; updatedAt: string; errorCode?: string; errorMessage?: string; productPlan?: string; productLimit?: number }; events: ReportEvent[]; document: { document?: { version: "1"; generatedAt: string; blocks: Block[] }; marketBrief?: Record<string, unknown> } | null; documentSchemaVersion: number; primaryProducts?: { authoritative: boolean; totalCount: number; products: Array<Record<string, unknown>>; truncated: boolean } } };
type AccountReport = { publicId: string; primaryDomain: string; status: string; createdAt: string; updatedAt: string };
type AccountReportsPayload = { eligible?: boolean; reports?: AccountReport[] };

const VIEWS: View[] = ["competitors", "products", "overview", "evidence"];
const VIEW_LABELS: Record<View, { en: string; ar: string }> = {
  competitors: { en: "Competitors", ar: "المنافسون" },
  products: { en: "Products", ar: "المنتجات" },
  overview: { en: "Benchmark", ar: "المقارنة المعيارية" },
  evidence: { en: "Evidence & Method", ar: "الأدلة والمنهجية" },
};

function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function list(value: unknown) { return Array.isArray(value) ? value : []; }
function numeric(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function repairEncoding(value: string) {
  if (!/(?:Ã|Â|Ø|Ù|â)/.test(value)) return value;
  try {
    const bytes = Uint8Array.from([...value].map((character) => character.charCodeAt(0)));
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return repaired.includes("�") ? value : repaired;
  } catch { return value; }
}
function display(value: unknown, fallback = "") {
  const clean = repairEncoding(typeof value === "string" ? value : "").replace(/&ndash;/g, "–").replace(/&amp;/g, "&").replace(/â|â/g, '"').trim();
  return clean || fallback;
}
function safeUrl(value: unknown) { const url = display(value); return /^https?:\/\/[^\s]+$/i.test(url) ? url : ""; }
function slug(value: unknown) { return display(value, "item").toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "") || "item"; }
function viewFromLocation(views: View[] = VIEWS): View { const value = new URLSearchParams(window.location.search).get("view"); return views.includes(value as View) ? value as View : views[0] || "competitors"; }
function layoutFromLocation(): ProductView { const value = new URLSearchParams(window.location.search).get("layout"); return PRODUCT_VIEWS.includes(value as ProductView) ? value as ProductView : "byproduct"; }
function competitorFromLocation() { return (new URLSearchParams(window.location.search).get("competitor") || "").trim().toLowerCase(); }
function viewHref(view: View, anchor = "") { return `?view=${view}${anchor ? `#${anchor}` : ""}`; }
function withCompetitor(href: string, domain: string, layout: ProductView = "byproduct") { const [path, hash] = href.split("#"); return `${path}&layout=${layout}&competitor=${encodeURIComponent(domain)}${hash ? `#${hash}` : ""}`; }
function dateLabel(value: string, ar: boolean) { const parsed = Date.parse(value); return Number.isFinite(parsed) ? new Intl.DateTimeFormat(ar ? "ar" : "en", { day: "numeric", month: "short", year: "numeric" }).format(parsed) : ""; }
function scrollToReportHash() {
  const raw = window.location.hash.slice(1); if (!raw) return;
  let id = raw; try { id = decodeURIComponent(raw); } catch { /* Keep a malformed but harmless literal fragment. */ }
  const target = document.getElementById(id);
  const group = target?.closest("details");
  if (group instanceof HTMLDetailsElement) group.open = true;
  target?.scrollIntoView({ block: "start" });
}

function reportHistoryStatus(status: string, ar: boolean) {
  if (status === "complete") return ar ? "مكتمل" : "Complete";
  if (status === "limited") return ar ? "محدود" : "Limited";
  if (status === "failed" || status === "interrupted") return ar ? "متوقف" : "Stopped";
  return ar ? "قيد التشغيل" : "Running";
}

function PaidReportHistory({ currentPublicId, ar }: { currentPublicId: string; ar: boolean }) {
  const [history, setHistory] = useState<AccountReportsPayload | null>(null);
  useEffect(() => {
    let current = true;
    fetch("/api/account/reports", { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } })
      .then(async (response) => response.ok ? readJsonResponse<AccountReportsPayload>(response, "Your reports") : null)
      .then((payload) => { if (current && payload?.eligible) setHistory(payload); })
      .catch(() => { /* Public and unpaid viewers simply keep the private history hidden. */ });
    return () => { current = false; };
  }, []);
  if (!history?.eligible) return null;
  const reports = Array.isArray(history.reports) ? history.reports : [];
  return <details className="ds-details rp-history" aria-label={ar ? "تقاريرك الأخيرة" : "Your recent reports"}>
    <summary>{ar ? "تقاريرك" : "Your reports"} <span className="ds-tab-count">{reports.length}</span></summary>
    {reports.length ? <ol className="rp-history-list">{reports.map((report) => {
      const current = report.publicId === currentPublicId;
      return <li key={report.publicId}><Link href={`/reports/${report.publicId}?view=products`} aria-current={current ? "page" : undefined}><span dir="ltr">{report.primaryDomain}</span><small>{reportHistoryStatus(report.status, ar)}{dateLabel(report.updatedAt || report.createdAt, ar) ? ` · ${dateLabel(report.updatedAt || report.createdAt, ar)}` : ""}{current ? ` · ${ar ? "الحالي" : "current"}` : ""}</small></Link></li>;
    })}</ol> : <p className="ds-note">{ar ? "ستظهر تقاريرك هنا بعد أول تشغيل." : "Your reports will appear here after the first run."}</p>}
  </details>;
}

function PriceWatchWorkspaceLink({ ar }: { ar: boolean }) {
  const [unread, setUnread] = useState(0);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let current = true;
    fetch("/api/price-watch/notifications", { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } })
      .then(async (response) => response.ok ? readJsonResponse<{ unread?: number }>(response, "Price-watch notifications") : null)
      .then((payload) => { if (current && payload) { setUnread(Number(payload.unread || 0)); setAvailable(true); } })
      .catch(() => { /* Legacy and unbilled reports do not expose workspace monitoring. */ });
    return () => { current = false; };
  }, []);
  if (!available) return null;
  return <><span className="ds-tab-sep" aria-hidden="true" /><Link className="ds-tab" href="/price-watch">{ar ? "مراقبة الأسعار" : "Price watch"}{unread > 0 && <b>{unread}</b>}</Link></>;
}

function StoppedReportWorkspace({ run, ar, onToggleLocale }: { run: NonNullable<StoredPayload["report"]>["run"]; ar: boolean; onToggleLocale: () => void }) {
  const presentation = stoppedReportPresentation(run.errorMessage || "", run.errorCode || "", ar);
  const observedAt = run.updatedAt || run.createdAt;
  const websiteUrl = safeUrl(`https://${run.primaryDomain}`);
  useEffect(() => {
    const url = new URL(window.location.href);
    const before = url.toString();
    url.searchParams.delete("view"); url.searchParams.delete("layout"); url.searchParams.delete("competitor"); url.hash = "";
    if (url.toString() !== before) window.history.replaceState({}, "", url);
  }, []);
  return <div className="ds-frame-wide">
    <ReportCrumbs domain={run.primaryDomain} observedAt={observedAt} ar={ar} onToggleLocale={onToggleLocale} mode="stopped" />
    <section className="rp-decision" aria-label={ar ? "حالة التقرير" : "Report status"}>
      <div>
        <div className="rp-title-row"><h1 className="ds-h1-sm"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{run.primaryDomain}</span></h1><span className="rp-status is-stopped" role="status"><span aria-hidden="true">○</span>{ar ? "متوقف" : "Stopped"}</span></div>
        <p className="rp-headline">{presentation.title}</p>
        <div className="rp-counts"><span><b className="is-hollow">○</b> {ar ? "منافسون موثقون" : "verified competitors"}</span><span><b className="is-hollow">○</b> {ar ? "مقارنات مقبولة" : "accepted comparisons"}</span><span>{ar ? "لم تُنشأ مقارنة" : "No comparison was created"}</span></div>
      </div>
      <div>
        <div className="rp-actions"><Link className="ds-btn ds-btn-primary" href="/">{ar ? "تقرير جديد" : "New report"}</Link>{websiteUrl && <a className="ds-btn" href={websiteUrl} target="_blank" rel="noreferrer">{ar ? "افتح الموقع ↗" : "Open website ↗"}</a>}</div>
        <p className="rp-hint">{ar ? "لم يُستهلك رصيد لتقرير غير مكتمل؛ ابدأ تشغيلاً جديداً من الصفحة الرئيسية." : "An incomplete run publishes nothing; start a fresh run from the home page."}</p>
      </div>
    </section>
    <div className="rp-panel">
      <div className="rp-states">
        <EdgeStateCard role="alert" where={ar ? "التشغيل" : "Progress"} state="unavailable" stateLabel={ar ? "غير متاح" : "Unavailable"} title={ar ? "تشغيل فاشل أو متقطع" : "Failed or interrupted run"} body={presentation.summary}
          actions={<><Link href="/">{ar ? "ابدأ تقريراً جديداً" : "Start a new report"}</Link><ActionSeparator /><Link href="/">{ar ? "جرّب نطاقاً آخر" : "Try another domain"}</Link>{websiteUrl && <><ActionSeparator /><a href={websiteUrl} target="_blank" rel="noreferrer">{ar ? "افتح الموقع ↗" : "Open website ↗"}</a></>}</>}>
          {run.errorMessage && run.errorMessage !== presentation.summary && <details className="rp-state-detail"><summary>{ar ? "التفاصيل التقنية" : "Technical detail"}</summary><p>{run.errorMessage}</p></details>}
        </EdgeStateCard>
      </div>
      {run.publicId && <PaidReportHistory currentPublicId={run.publicId} ar={ar} />}
    </div>
  </div>;
}

function ReportWorkspace({ blocks, primaryProducts, resourceId, privatePublicId, matchesEndpoint, mode, primaryDomain, observedAt, reportStatus, reportEvents, documentVersion, ar, onToggleLocale }: { blocks: Block[]; primaryProducts?: { authoritative: boolean; totalCount: number; products: Array<Record<string, unknown>>; truncated: boolean }; resourceId: string; privatePublicId?: string; matchesEndpoint: string; mode: "workspace" | "shared"; primaryDomain: string; observedAt: string; reportStatus: string; reportEvents: ReportEvent[]; documentVersion: number; ar: boolean; onToggleLocale: () => void }) {
  const domainStatus = blocks.find((block) => block.type === "domain-status" && ["parked", "unavailable"].includes(display(block.status).toLowerCase()));
  const domainState = display(domainStatus?.status).toLowerCase();
  const terminalDomain = Boolean(domainStatus);
  const parked = domainState === "parked";
  const unavailableDomain = domainState === "unavailable";
  const activeViews = useMemo<View[]>(() => terminalDomain ? ["overview"] : VIEWS, [terminalDomain]);
  const [view, setView] = useState<View>(VIEWS[0]);
  const [layout, setLayout] = useState<ProductView>("byproduct");
  const [competitorFilter, setCompetitorFilter] = useState("");
  const compactNav = true;
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => { const sync = () => { const requested = new URLSearchParams(window.location.search).get("view"); const next = viewFromLocation(activeViews); setView(next); setLayout(layoutFromLocation()); setCompetitorFilter(competitorFromLocation()); if (!activeViews.includes(requested as View)) { const url = new URL(window.location.href); url.searchParams.set("view", next); url.hash = ""; window.history.replaceState({}, "", url); } }; sync(); window.addEventListener("popstate", sync); return () => window.removeEventListener("popstate", sync); }, [activeViews]);
  useEffect(() => { const frame = window.requestAnimationFrame(scrollToReportHash); window.addEventListener("hashchange", scrollToReportHash); return () => { window.cancelAnimationFrame(frame); window.removeEventListener("hashchange", scrollToReportHash); }; }, [view, blocks]);
  useEffect(() => { if (compactNav) tabs.current[activeViews.indexOf(view)]?.scrollIntoView({ inline: "nearest", block: "nearest" }); }, [activeViews, compactNav, view]);
  useEffect(() => {
    let printOpened: HTMLDetailsElement[] = [];
    const expandPrintEvidence = () => { printOpened = Array.from(document.querySelectorAll<HTMLDetailsElement>(".rp-evidence-group:not([open]), .rp-method:not([open]), .rp-catalog:not([open]), .comparison-detail-disclosure:not([open]), .product-match-details:not([open]), .evidence-source-group:not([open])")); printOpened.forEach((detail) => { detail.open = true; }); };
    const restorePrintEvidence = () => { printOpened.forEach((detail) => { detail.open = false; }); printOpened = []; };
    window.addEventListener("beforeprint", expandPrintEvidence); window.addEventListener("afterprint", restorePrintEvidence);
    return () => { window.removeEventListener("beforeprint", expandPrintEvidence); window.removeEventListener("afterprint", restorePrintEvidence); };
  }, []);
  const selectView = (next: View, replace = false, hash = "", params: Record<string, string> = {}) => {
    const url = new URL(window.location.href); url.searchParams.set("view", next); url.hash = hash;
    Object.entries(params).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); });
    if (next !== "products") { url.searchParams.delete("layout"); url.searchParams.delete("competitor"); }
    window.history[replace ? "replaceState" : "pushState"]({}, "", url); setView(next);
    if (next === "products") { setLayout(layoutFromLocation()); setCompetitorFilter(competitorFromLocation()); }
    if (!hash) window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };
  const updateProductParams = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); });
    window.history.replaceState({}, "", url);
  };
  const changeLayout = (next: ProductView) => { setLayout(next); updateProductParams({ layout: next }); };
  const changeCompetitor = (next: string) => { setCompetitorFilter(next); updateProductParams({ competitor: next }); };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forwardKey = compactNav ? (ar ? "ArrowLeft" : "ArrowRight") : "ArrowDown"; const backwardKey = compactNav ? (ar ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const next = event.key === forwardKey ? (index + 1) % activeViews.length : event.key === backwardKey ? (index - 1 + activeViews.length) % activeViews.length : event.key === "Home" ? 0 : event.key === "End" ? activeViews.length - 1 : -1;
    if (next < 0) return; event.preventDefault(); tabs.current[next]?.focus(); selectView(activeViews[next]);
  };
  const onWorkspaceClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="?view="]'); if (!anchor) return;
    const url = new URL(anchor.href); const next = url.searchParams.get("view") as View; if (!activeViews.includes(next)) return;
    event.preventDefault(); selectView(next, false, url.hash.slice(1), { layout: url.searchParams.get("layout") || "", competitor: url.searchParams.get("competitor") || "" });
  };

  const comparison = blocks.find((block) => block.type === "product-comparison");
  const competitors = useMemo(() => publishedComparisonCompetitors(blocks, comparison).sort((a, b) => numeric(b.comparisonCount) - numeric(a.comparisonCount) || numeric(b.verificationScore) - numeric(a.verificationScore)), [blocks, comparison]);
  const legacyUngatedMatchCount = useMemo(() => countLegacyUngatedProductMatches(comparison), [comparison]);
  const battles = useMemo(() => list(comparison?.rows).flatMap((row, rowIndex) => {
    const item = object(row); const primary = object(item.primary);
    return list(item.matches).flatMap((match, matchIndex) => { const candidate = object(match); const rival = object(candidate.product); return object(candidate.publication).priceEligible === true && rival.name ? [{ primary, rival, match: candidate, key: `${rowIndex}-${matchIndex}` }] : []; });
  }), [comparison]);
  const rows = useMemo(() => battles.map((battle) => prepareRow(battle, ar)), [battles, ar]);
  const [authoritativeMatchSummary, setAuthoritativeMatchSummary] = useState<{ publicId: string; totalCount: number; directPriceCount?: number; domainCounts: Record<string, number> } | null>(null);
  const receiveAuthoritativeMatchSummary = useCallback((summary: { totalCount: number; domainCounts: Record<string, number> }) => setAuthoritativeMatchSummary((current) => ({ publicId: resourceId, directPriceCount: current?.publicId === resourceId ? current.directPriceCount : undefined, ...summary })), [resourceId]);
  useEffect(() => {
    let current = true;
    fetch(`${matchesEndpoint}?limit=1`, { cache: "no-store", headers: { accept: "application/json" } })
      .then((response) => readJsonResponse<{ ok: boolean; page?: { authoritative: true; totalCount: number; directPriceCount?: number; domainCounts: Record<string, number> } }>(response, "Saved report match totals"))
      .then((body) => { if (current && body.ok && body.page?.authoritative) setAuthoritativeMatchSummary({ publicId: resourceId, totalCount: body.page.totalCount, directPriceCount: body.page.directPriceCount, domainCounts: body.page.domainCounts || {} }); })
      .catch(() => { /* The compact report counts remain the explicit fallback. */ });
    return () => { current = false; };
  }, [matchesEndpoint, resourceId]);
  const currentMatchSummary = authoritativeMatchSummary?.publicId === resourceId ? authoritativeMatchSummary : null;
  const productMatchTotal = currentMatchSummary?.totalCount ?? battles.length;
  const directPriceTotal = currentMatchSummary?.directPriceCount ?? rows.filter((row) => row.priceClaim.kind === "direct").length;
  const evidence = blocks.filter((block) => block.type === "evidence");
  const gaps = blocks.filter((block) => block.type === "gap");
  const domainAlternatives = list(domainStatus?.alternatives).map(object);
  const coverage = blocks.filter((block) => block.type === "coverage");
  const profile = blocks.find((block) => block.type === "market-profile");
  const experienceBenchmark = blocks.find((block) => block.type === "experience-benchmark");
  const benchmarkCount = benchmarkDimensionCount(experienceBenchmark, primaryDomain);
  const coverageStatus = reportCoverage(reportStatus, reportEvents, ar);
  const limited = reportStatus === "limited";
  const productsObserved = primaryProducts?.totalCount || numeric(object(comparison?.matching).publishedPrimaryProducts) || list(comparison?.rows).length;
  const excludedPriceMatches = numeric(object(object(comparison?.matching).publication).suppressedAcceptedPairs);
  const productAnchor = (domain: unknown) => `rival-${slug(domain)}`;
  const competitorAnchor = (domain: unknown) => `competitor-${slug(domain)}`;
  const evidenceAnchor = (domain: unknown) => `evidence-${slug(domain)}`;

  // One-sentence headline computed from the saved comparison snapshot.
  const rivalLower = rows.filter((row) => row.diffTone === "rival");
  const youLower = rows.filter((row) => row.diffTone === "you");
  const needsEvidence = rows.filter((row) => row.diffTone === "evidence");
  const headline = terminalDomain
    ? (parked ? (ar ? "هذا النطاق معروض للبيع، لا موقع شركة نشط." : "This domain is parked, not an active company site.") : (ar ? "تعذر الوصول إلى موقع عام على هذا النطاق." : "No public website response was available for this domain."))
    : !rows.length
      ? (limited ? coverageStatus.title : (ar ? "لم تُحفظ مقارنة سعرية مقبولة لهذا التقرير." : "No accepted priced comparison was saved for this report."))
      : ar
        ? `المنافس أقل سعراً في ${rivalLower.length} من ${rows.length} مقارنة مقبولة؛ أنت أقل في ${youLower.length}؛ ${needsEvidence.length} تحتاج دليلاً.`
        : `Rival lower on ${rivalLower.length} of ${rows.length} accepted comparisons; you lead on ${youLower.length}; ${needsEvidence.length} need evidence.`;

  const nextMoves = useMemo<NextMove[]>(() => {
    const moves: NextMove[] = [];
    const rowMove = (row: ReturnType<typeof prepareRow>) => ({ key: `row-${row.battle.key}`, text: `${row.shortAction} — ${display(row.battle.primary.name, ar ? "منتجك" : "your product")} ${ar ? "مقابل" : "vs"} ${row.domain}.`, source: row.actionSource as NextMove["source"], href: withCompetitor(viewHref("products", productAnchor(row.domain)), row.domain, "matchups") });
    const pressure = [...rivalLower].sort((a, b) => (b.priceClaim.kind === "direct" ? b.priceClaim.percent : 0) - (a.priceClaim.kind === "direct" ? a.priceClaim.percent : 0))[0];
    if (pressure) moves.push(rowMove(pressure));
    const benchmark = benchmarkNextMove(experienceBenchmark, primaryDomain, ar);
    if (benchmark) moves.push({ ...benchmark, source: "deterministic" });
    const advantage = [...youLower].sort((a, b) => (b.priceClaim.kind === "direct" ? b.priceClaim.percent : 0) - (a.priceClaim.kind === "direct" ? a.priceClaim.percent : 0))[0];
    if (advantage) moves.push(rowMove(advantage));
    if (moves.length < 3 && needsEvidence[0]) moves.push(rowMove(needsEvidence[0]));
    return moves.slice(0, 3);
  }, [rivalLower, youLower, needsEvidence, experienceBenchmark, primaryDomain, ar]);

  const [csvState, setCsvState] = useState<"idle" | "preparing" | "done" | "failed">("idle");
  const runCsvExport = async () => {
    setCsvState("preparing");
    try { await exportReportCsv({ matchesEndpoint, battles, primaryDomain, ar }); setCsvState("done"); window.setTimeout(() => setCsvState("idle"), 2400); }
    catch { setCsvState("failed"); }
  };
  const csvLabel = csvState === "preparing" ? (ar ? "جارٍ التحضير…" : "Preparing…") : csvState === "done" ? (ar ? "تم التنزيل" : "Downloaded") : csvState === "failed" ? (ar ? "فشل التصدير — أعد المحاولة" : "Export failed — retry") : (ar ? "تصدير CSV" : "Export CSV");
  const deepLink = `#${view}${view === "products" ? `?layout=${layout}${competitorFilter ? `&competitor=${competitorFilter}` : ""}` : ""}`;
  const claimState = (claim: Block) => { const type = display(claim.claimType, "observed").toLowerCase(); return type === "observed" ? "observed" : type === "estimated" ? "limited" : "inferred"; };

  return <div className="ds-frame-wide" onClick={onWorkspaceClick}>
    <ReportCrumbs domain={primaryDomain} observedAt={observedAt} version={documentVersion} ar={ar} onToggleLocale={onToggleLocale} mode={mode} />

    <section className="rp-decision" aria-label={ar ? "ملخص القرار" : "Decision header"}>
      <div>
        <div className="rp-title-row">
          <h1 className="ds-h1-sm"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{primaryDomain}</span></h1>
          <span className={`rp-status ${limited || terminalDomain ? "is-limited" : "is-complete"}`} role="status"><span aria-hidden="true">{limited || terminalDomain ? "◔" : "●"}</span>{limited || terminalDomain ? (ar ? "محدود" : "Limited") : (ar ? "مكتمل" : "Complete")}</span>
        </div>
        <p className="rp-headline">{headline}</p>
        <div className="rp-counts">
          <span><b>{competitors.length}</b> {ar ? "منافسون موثقون" : "verified competitors"}</span>
          <span><b>{productMatchTotal}</b> {ar ? "مقارنات مقبولة" : "accepted comparisons"}</span>
          <span><b>{directPriceTotal}</b> {ar ? "مقارنات سعر مباشرة" : "direct price comparisons"}</span>
          <span>{productsObserved ? <b>{productsObserved}</b> : <b className="is-hollow">○</b>} {ar ? "منتجات مرصودة" : "products observed"}</span>
          {!terminalDomain && <a href="?view=evidence">{ar ? "راجع المصادر والحدود" : "Review sources and limits"} ↗</a>}
        </div>
        {(limited || terminalDomain || legacyUngatedMatchCount > 0) && <div className="rp-limits">
          <p>◔ {ar ? "حدود التغطية" : "Coverage limits"}</p>
          <ul>
            <li>{coverageStatus.detail}</li>
            <li>{ar ? "لم تُفحص مصادر الإعلانات في هذا التشغيل." : "Advertising sources were not checked in this run."}</li>
            {excludedPriceMatches > 0 && <li>{ar ? `${excludedPriceMatches} مطابقة أُبقيت خارج جدول الأسعار؛ التفاصيل في المنتجات.` : `${excludedPriceMatches} matches were kept out of the price table; details under Products.`}</li>}
            {legacyUngatedMatchCount > 0 && <li>{ar ? "أُنشئ هذا التقرير قبل بوابة التحقق الحالية للسوق والعملة؛ صفوفه القديمة مخفية." : "This report predates the current market-and-currency validation gate; its older rows are hidden."}</li>}
            {gaps.length > 0 && <li>{ar ? `${gaps.length} فجوة تحقيق مسجلة — ` : `${gaps.length} investigation gaps recorded — `}<a href="?view=evidence">{ar ? "الأدلة والمنهجية" : "Evidence & Method"}</a></li>}
          </ul>
        </div>}
      </div>
      <div>
        <div className="rp-actions">
          {mode === "workspace" && privatePublicId && <ReportShareControl publicId={privatePublicId} ar={ar} />}
          <button type="button" className="ds-btn" onClick={() => void runCsvExport()} disabled={csvState === "preparing" || (!rows.length && !productMatchTotal)}>{csvLabel}</button>
          <button type="button" className="ds-btn" onClick={() => window.print()}>{ar ? "طباعة" : "Print"}</button>
        </div>
        <NextMoves moves={nextMoves} ar={ar} hint={<p className="rp-hint">{mode === "shared" ? (ar ? "تقرير مشترك للقراءة فقط." : "Shared · read only.") : (ar ? "روابط المشاركة غير مدرجة وليست مصرّحة. أي شخص لديه الرابط يمكنه العرض." : "Share links are unlisted, not permissioned. Anyone with the link can view.")}</p>} />
      </div>
    </section>


    <div className="ds-tabs rp-tabs" role="tablist" aria-orientation={compactNav ? "horizontal" : "vertical"} aria-label={ar ? "أقسام التقرير" : "Report sections"}>
      {activeViews.map((item, index) => <button key={item} ref={(node) => { tabs.current[index] = node; }} id={`tab-${item}`} type="button" className="ds-tab" role="tab" aria-selected={view === item} aria-controls={`panel-${item}`} tabIndex={view === item ? 0 : -1} onClick={() => selectView(item)} onKeyDown={(event) => onTabKey(event, index)}>
        {VIEW_LABELS[item][ar ? "ar" : "en"]}
        {item === "competitors" && <span className="ds-tab-count">{competitors.length}</span>}
        {item === "products" && <span className="ds-tab-count">{productMatchTotal}</span>}
        {item === "overview" && (benchmarkCount === null ? <span className="ds-tab-count is-hollow" title={ar ? "لا مقارنة معيارية في هذا التقرير" : "No benchmark in this report"} /> : <span className="ds-tab-count">{benchmarkCount}</span>)}
        {item === "evidence" && <span className="ds-tab-count">{evidence.length}</span>}
      </button>)}
      {mode === "workspace" && <PriceWatchWorkspaceLink ar={ar} />}
      <span className="ds-spacer" />
      <span className="rp-deeplink">{deepLink}</span>
    </div>
    <EvidenceLegend ar={ar} />

    <section className="rp-panel" id={`panel-${view}`} role="tabpanel" aria-labelledby={`tab-${view}`} tabIndex={0}>
      {view === "overview" && terminalDomain && <div className="rp-states">
        <EdgeStateCard where={ar ? "النطاق" : "Progress"} state={parked ? "limited" : "unavailable"} stateLabel={parked ? (ar ? "محدود" : "Limited") : (ar ? "غير متاح" : "Unavailable")} title={parked ? (ar ? "نطاق معروض للبيع" : "Parked domain") : (ar ? "نطاق لا يستجيب" : "Unreachable domain")}
          body={<>{ar ? "لم نفحص المنافسين أو المنتجات. " : "Competitors and products were not checked. "}{display(domainStatus?.explanation, parked ? (ar ? "يتجه النطاق إلى خدمة عامة لبيع النطاقات، لذلك لم تُشغّل مراحل المنافسين والمنتجات. هذه ليست نتيجة صفرية." : "The submitted domain redirects to a public domain-for-sale service, so competitor and product analysis did not run. This is not a zero-result report.") : (ar ? "لم يعد العنوان العام باستجابة شبكة بعد محاولتين محدودتين، لذلك لم يبدأ تحليل السوق. هذه ليست نتيجة صفرية." : "The public HTTPS address returned no network response after two bounded attempts, so market analysis did not start. This is not a zero-result report."))}</>}
          actions={<>{parked && safeUrl(domainStatus?.evidenceUrl) && <><a href={safeUrl(domainStatus?.evidenceUrl)} target="_blank" rel="noreferrer">{ar ? "افتح دليل النطاق ↗" : "Open parking evidence ↗"}</a><ActionSeparator /></>}{unavailableDomain && safeUrl(domainStatus?.attemptedUrl) && <><a href={safeUrl(domainStatus?.attemptedUrl)} target="_blank" rel="noreferrer">{ar ? "افتح العنوان الذي تمت محاولته ↗" : "Open attempted address ↗"}</a><ActionSeparator /></>}<Link href="/">{ar ? "تحقق من النطاق أو حاول مرة أخرى" : "Check the domain or try again"}</Link></>} />
        {parked && domainAlternatives.length > 0 && <EdgeStateCard where={ar ? "نطاقات محتملة — الهوية غير متحققة" : "POSSIBLE DOMAINS — IDENTITY NOT VERIFIED"} state="inferred" stateLabel={ar ? "مستنتج" : "Inferred"} title={ar ? "نطاق بديل محتمل" : "Possible alternative domain"} body={ar ? "نتائج بحث مرتبطة بالاسم؛ لم نتحقق من أنها الشركة نفسها. استخدم أحدها فقط إذا أكدت أنه يخص شركتك." : "Name-related search results; we have not verified they are the same company. Use one only if you confirm it belongs to your company."}>
          <ul className="rp-state-alternatives">{domainAlternatives.map((alternative) => <li key={display(alternative.domain)}><a href={safeUrl(alternative.sourceUrl) || "#"} target="_blank" rel="noreferrer"><strong>{display(alternative.domain)}</strong><small>{display(alternative.reason, ar ? "نتيجة بحث مرتبطة بالاسم، غير متحققة" : "Unverified name-related search result")}</small></a></li>)}</ul>
        </EdgeStateCard>}
      </div>}
      {view === "overview" && !terminalDomain && <ExperienceBenchmark block={experienceBenchmark} primaryDomain={primaryDomain} ar={ar} />}

      {view === "competitors" && <div className="rp-competitors">
        <CompetitorDirectory key={resourceId} publicId={resourceId} matchesEndpoint={matchesEndpoint} workspaceMode={mode === "workspace"} ar={ar} rivals={competitors.map((competitor) => {
          const domain = display(competitor.domain);
          const rivalBattles = battles.filter((battle) => display(battle.match.domain || battle.rival.domain) === domain);
          const sources = [[safeUrl(competitor.websiteSourceUrl), ar ? "الموقع" : "Website"], [safeUrl(competitor.matchedProductUrl), ar ? "منتج مثبت" : "Proven product"], [safeUrl(competitor.discoverySourceUrl), ar ? "مصدر الاكتشاف" : "Discovery source"]].filter(([url]) => url).map(([url, label]) => ({ url, label }));
          return {
            domain, name: display(competitor.companyName || domain, domain),
            reason: display(competitor.reason || competitor.description, ar ? "أُدرج هذا البائع لأن له مقارنة أسعار مقبولة واحدة على الأقل." : "This seller is included because it has at least one accepted priced comparison."),
            relationship: display(competitor.relationship, ar ? "مقارنة منتج مسعّرة" : "Priced product comparison"),
            confidence: display(competitor.confidence),
            count: currentMatchSummary?.domainCounts?.[domain] ?? (numeric(competitor.comparisonCount) || rivalBattles.length),
            score: numeric(competitor.verificationScore),
            source: safeUrl(competitor.websiteSourceUrl || competitor.discoverySourceUrl),
            productHref: withCompetitor(viewHref("products", productAnchor(domain)), domain), anchor: competitorAnchor(domain),
            category: display(competitor.marketCategory),
            overlapTerms: list(competitor.overlapTerms).map((term) => display(term)).filter(Boolean),
            hasProductOverlap: competitor.hasProductOverlap === true,
            productCount: numeric(competitor.productCount),
            matchedProductName: display(competitor.matchedProductName),
            sources,
            observedAt: display(competitor.rememberedVerifiedAt) || observedAt,
            pairDerived: competitor.pairDerived === true,
            regionCompatibility: typeof competitor.regionCompatibility === "boolean" ? competitor.regionCompatibility : null,
            categoryAlignment: typeof competitor.categoryAlignment === "boolean" ? competitor.categoryAlignment : null,
          };
        })} />
        {!competitors.length && <div className="rp-states"><EdgeStateCard where={ar ? "المنافسون" : "Competitors"} state="limited" stateLabel={ar ? "محدود" : "Limited"} title={ar ? "لم يُوثّق منافس" : "No verified competitor"} body={ar ? "لم يجتز أي مرشح التحقق المستقل في هذا التشغيل. هذا نقص في التغطية، وليس دليلاً على عدم وجود منافسين." : "No candidate passed independent verification in this run. This is a coverage gap, not proof that no competitors exist."} actions={<><a href="?view=evidence">{ar ? "اعرض الأدلة والحدود" : "See evidence and limits"}</a><ActionSeparator /><Link href="/">{ar ? "أعد التشغيل" : "Re-run the report"}</Link></>} /></div>}
        <p className="rp-footnote">{ar ? "«لم يُوثّق منافس» يعني أن أحداً لم يجتز التحقق المستقل في هذا التشغيل، لا أنه لا يوجد منافسون. المرشحون الذين فشلوا في التحقق يبقون ضمن الأدلة والمنهجية." : "“No competitor verified” would mean none passed independent verification in this run, not that none exist. Candidates that failed verification are kept in Evidence & Method. This list is derived only from sellers in accepted priced comparisons; broad discovery does not count as a competitor."}</p>
      </div>}

      {view === "products" && <>
        {legacyUngatedMatchCount > 0 && <div className="rp-notice" role="status"><span className="ds-label">◔ {ar ? "تحتاج مقارنات الأسعار المحفوظة إلى إعادة التحقق" : "Saved price comparisons need revalidation"}</span><span>{ar ? "أُنشئ هذا التقرير قبل بوابة التحقق الحالية للسوق والعملة. أخفينا صفوفه القديمة بدلاً من عرض أسعار قد تكون من سوق مختلف. شغّل تقريراً جديداً للحصول على مقارنات متحققة." : "This report predates the current market-and-currency validation gate. Its older rows are hidden rather than showing prices that may belong to another market. Run a new report for verified comparisons."}</span><Link href="/">{ar ? "شغّل تقريراً جديداً" : "Run a new report"}</Link></div>}
        <ProductDesignLab key={resourceId} comparison={comparison} battles={battles} primaryProducts={primaryProducts} publicId={resourceId} matchesEndpoint={matchesEndpoint} workspaceMode={mode === "workspace"} authoritativeMatchTotal={productMatchTotal || undefined} onAuthoritativeSummary={receiveAuthoritativeMatchSummary} primaryDomain={primaryDomain} observedAt={observedAt} ar={ar} view={layout} onViewChange={changeLayout} competitorFilter={competitorFilter} onCompetitorFilterChange={changeCompetitor} competitorCounts={currentMatchSummary?.domainCounts} />
      </>}

      {view === "evidence" && <div className="rp-evidence">
        <div className="rp-evidence-intro"><h2>{ar ? "ما الذي يدعم قرارات هذا التقرير، وما الذي لا يثبته؟" : "What supports this report's decisions—and what does it not prove?"}</h2><p>{ar ? "ادعاءات مجمعة حسب النطاق، لكل منها نوع وثقة ومصدر وتاريخ رصد. تظل الحقائق والاستنتاجات وفجوات التغطية منفصلة." : "Claims grouped by domain, each with type, confidence, source and observation date. Facts, interpretations and coverage gaps stay separate."}</p></div>
        <div className="rp-counts">
          <span><b>{evidence.length}</b> {ar ? "ادعاءات مرتبطة بالمصدر" : "source-linked claims"}</span>
          <span><b>{evidence.filter((item) => display(item.claimType).toLowerCase() === "observed").length}</b> {ar ? "مرصودة" : "observed"}</span>
          <span><b>{evidence.filter((item) => display(item.claimType).toLowerCase() === "inferred").length}</b> {ar ? "مستنتجة" : "inferred"}</span>
          <span><b>{coverage.reduce((sum, item) => sum + numeric(item.pagesFetched), 0)}</b> {ar ? "صفحات مزحوفة" : "pages crawled"}</span>
          <span><b>{gaps.length}</b> {ar ? "فجوات التحقيق" : "investigation gaps"}</span>
        </div>
        <div className="rp-evidence-groups">{[primaryDomain, ...competitors.map((item) => display(item.domain))].filter((domain, index, all) => domain && all.indexOf(domain) === index).map((domain) => {
          const claims = evidence.filter((claim) => { try { return new URL(safeUrl(claim.sourceUrl)).hostname.replace(/^www\./, "") === domain.replace(/^www\./, ""); } catch { return false; } });
          return <details className="ds-details rp-evidence-group" id={evidenceAnchor(domain)} key={domain} open={domain === primaryDomain}>
            <summary><span className="ds-label">{domain === primaryDomain ? (ar ? "شركتك" : "Your company") : (ar ? "منافس" : "Competitor")}</span><h3>{domain}</h3><span className="ds-spacer" /><b>{claims.length} {ar ? "ادعاءات" : "claims"}</b></summary>
            {claims.length ? <ul className="rp-claims">{claims.map((claim) => { const state = claimState(claim); return <li key={claim.id}><EvidenceTag state={state} label={evidenceStateLabel(state, ar)} small title={display(claim.claimType)} /><p dir="auto">{display(claim.text)}</p><span><span>{display(claim.confidence, ar ? "ثقة محدودة" : "Limited confidence")}</span>{dateLabel(display(claim.observedAt), ar) && <span>{dateLabel(display(claim.observedAt), ar)}</span>}{safeUrl(claim.sourceUrl) && <a href={safeUrl(claim.sourceUrl)} target="_blank" rel="noreferrer">{ar ? "افتح المصدر ↗" : "Open source ↗"}</a>}</span></li>; })}</ul> : <p className="rp-claims-empty">{ar ? "لا توجد ادعاءات محفوظة لهذا النطاق." : "No saved claims for this domain."}</p>}
          </details>;
        })}</div>
        <div className="rp-coverage">
          <section><h3>{ar ? "تغطية الزحف" : "Crawl coverage"}</h3><ul>{coverage.map((item) => <li key={item.id}><span><strong>{display(item.domain)}</strong><small>{numeric(item.pagesFetched)}/{numeric(item.pagesRequested)} {ar ? "صفحات" : "pages"}</small></span><p>{list(item.gaps).map((gap) => display(gap)).filter(Boolean).join(" · ") || (ar ? "لم تُحفظ فجوة لهذا النطاق." : "No crawl gap was saved for this domain.")}</p></li>)}{!coverage.length && <li><p>{ar ? "لم تُحفظ تغطية زحف." : "No crawl coverage was saved."}</p></li>}</ul></section>
          <section><h3>{ar ? "فجوات التحقيق" : "Investigation gaps"}</h3><ul>{gaps.slice(0, 30).map((gap) => <li key={gap.id}><span><strong>{display(gap.domain, ar ? "مصدر عام" : "Public source")}</strong><small>{dateLabel(display(gap.observedAt), ar)}</small></span><p>{display(gap.reason)}</p>{safeUrl(gap.url) && <a href={safeUrl(gap.url)} target="_blank" rel="noreferrer">{ar ? "افتح المصدر ↗" : "Open source ↗"}</a>}</li>)}{!gaps.length && <li><p>{ar ? "لم تُسجَّل فجوة تحقيق." : "No investigation gap was recorded."}</p></li>}</ul></section>
        </div>
        <section className="rp-plain" id="method">
          <h3>{ar ? "كيف أُعد هذا التقرير" : "How this report was assembled"}</h3>
          <div className="rp-plain-grid">
            <article><strong>{ar ? "السوق" : "Market"}</strong><p>{ar ? `صُنّف النشاط ضمن ${display(profile?.category, "فئة غير محسومة")} ويخدم ${display(profile?.region, "منطقة غير محسومة")}.` : `We identified this as a ${display(profile?.category, "category-unresolved")} business serving ${display(profile?.region, "an unresolved region")}.`}</p></article>
            <article><strong>{ar ? "مطابقة المنتجات" : "Product matching"}</strong><p>{ar ? "احتُفظ بأزواج المنتجات فقط عندما اجتازت بوابة الجودة وظل رابطا المصدر متاحين للتحقق." : `Product pairs were matched using ${display(object(comparison?.matching).method, "a structured similarity check")} and kept only when they cleared the quality gate and retained both source pages.`}</p></article>
          </div>
          <p>{ar ? "أي شيء لم يُرصد هنا هو حد للتغطية، وليس دليلاً على الغياب." : "Anything not observed here is a coverage limit, never evidence of absence."}</p>
          <details><summary>{ar ? "السجل التقني" : "Technical record"}</summary><p>{[display(profile?.model || profile?.provider), display(object(comparison?.matching).model)].filter(Boolean).join(" · ") || (ar ? "لا توجد معرّفات تقنية محفوظة." : "No technical identifiers were saved.")}</p></details>
        </section>
      </div>}
    </section>
    {mode === "workspace" && privatePublicId && <PaidReportHistory currentPublicId={privatePublicId} ar={ar} />}
  </div>;
}

type ReportResourceParams = Promise<{ publicId?: string; token?: string }> | { publicId?: string; token?: string };

export function StoredReportClient({ params, mode }: { params: ReportResourceParams; mode: "workspace" | "shared" }) {
  const [payload, setPayload] = useState<StoredPayload | null>(null); const [resourceId, setResourceId] = useState(""); const [error, setError] = useState(""); const [localeOverride, setLocaleOverride] = useState<"en" | "ar" | null>(null);
  useEffect(() => {
    let current = true;
    Promise.resolve(params).then((value) => {
      const id = mode === "shared" ? value.token || "" : value.publicId || "";
      if (!id) throw new Error("The report address is invalid.");
      setResourceId(id);
      const endpoint = mode === "shared" ? `/api/shared-reports/${id}` : `/api/reports/${id}`;
      return fetch(endpoint, { cache: "no-store", headers: { accept: "application/json" } }).then(async (response) => ({ id, response, body: await readJsonResponse<StoredPayload>(response, mode === "shared" ? "Shared report" : "Saved report") }));
    }).then(({ id, response, body }) => {
      if (!current) return;
      if (!response.ok || !body.ok) setError(body.error || (mode === "shared" ? "The shared report could not be opened." : "The saved report could not be opened."));
      else {
        setPayload(body);
        if (mode === "workspace" && !body.report?.document && ["queued", "running"].includes(body.report?.run.status || "")) window.location.replace(`/reports/${id}/loading`);
      }
    }).catch((cause) => current && setError(jsonResponseErrorMessage(cause, mode === "shared" ? "Shared report" : "Saved report")));
    return () => { current = false; };
  }, [mode, params]);
  const report = payload?.report; const stored = report?.document; const document = stored?.document; const ar = localeOverride ? localeOverride === "ar" : report?.run.locale === "ar"; const dir = ar ? "rtl" : "ltr";
  const lang = ar ? "ar" : "en";
  if (error) return <main className="ds-page" lang={lang} dir={dir}><div className="ds-frame-wide"><SiteHeader locale={lang} compact /><section className="rp-state-page" aria-labelledby="report-unavailable-title">
    <p className="rp-state-page-kicker">{mode === "shared" ? (ar ? "تقرير مشترك" : "Shared report") : (ar ? "تقرير محفوظ" : "Saved report")}</p>
    <h1 className="rp-state-page-title" id="report-unavailable-title">{ar ? "التقرير غير متاح" : "Report unavailable"}</h1>
    <p className="rp-state-page-lead">{ar ? "لم يُعرض أي جزء من التقرير كحقيقة: تعذر فتح المستند المحفوظ." : "Nothing is shown as fact: the saved document could not be opened."}</p>
    <div className="rp-states"><EdgeStateCard role="alert" where={ar ? "التقرير" : "Report"} state="unavailable" stateLabel={ar ? "غير متاح" : "Unavailable"} title={mode === "shared" ? (ar ? "الرابط المشترك لا يفتح" : "The shared link does not open") : (ar ? "التقرير المحفوظ لا يفتح" : "The saved report does not open")} body={error} actions={<><Link href="/account">{ar ? "افتح الحساب" : "Open my account"}</Link><ActionSeparator /><Link href="/">{ar ? "شغّل تقريراً جديداً" : "Run a new report"}</Link></>} /></div>
  </section></div></main>;
  if (mode === "workspace" && report && !document && ["failed", "interrupted"].includes(report.run.status)) return <main className="ds-page" lang={lang} dir={dir}><StoppedReportWorkspace run={report.run} ar={ar} onToggleLocale={() => setLocaleOverride(ar ? "en" : "ar")} /></main>;
  if (!report || !document) return <main className="ds-page" lang={lang} dir={dir}><div className="ds-frame-wide"><div className="rp-state-loading" role="status" aria-live="polite"><i aria-hidden="true" /><span>{ar ? "جارٍ فتح التقرير المحفوظ…" : "Opening the saved market report…"}</span></div></div></main>;
  if (report.documentSchemaVersion !== 1) return <main className="ds-page" lang={lang} dir={dir}><div className="ds-frame-wide"><SiteHeader locale={lang} compact /><section className="rp-state-page" aria-labelledby="report-version-title">
    <p className="rp-state-page-kicker">{ar ? "تقرير محفوظ" : "Saved report"}</p>
    <h1 className="rp-state-page-title" id="report-version-title">{ar ? "نسخة التقرير غير مدعومة" : "Unsupported saved-report version"}</h1>
    <p className="rp-state-page-lead">{ar ? "لا تُعرض الحقول الجزئية كحقائق." : "Partial fields are never rendered as facts."}</p>
    <div className="rp-states"><EdgeStateCard where={ar ? "التقرير" : "Report"} state="unavailable" stateLabel={ar ? "غير متاح" : "Unavailable"} title={ar ? "حُفظ التقرير بصيغة أحدث" : "This report was saved with a newer format"} body={ar ? `حُفظ هذا التقرير بصيغة (v${report.documentSchemaVersion}) أحدث مما يمكن لهذه الصفحة عرضه. يمكنك تنزيل JSON الخام أو تشغيل تقرير جديد.` : `This report was saved with a newer format (v${report.documentSchemaVersion}) than this page can show. Download the saved JSON or run a fresh report.`} actions={<><a href={mode === "shared" ? `/api/shared-reports/${resourceId}` : `/api/reports/${resourceId}`} target="_blank" rel="noreferrer">{ar ? "نزّل JSON المحفوظ" : "Download saved JSON"}</a><ActionSeparator /><Link href="/">{ar ? "شغّل مرة أخرى" : "Run again"}</Link></>} /></div>
  </section></div></main>;
  const matchesEndpoint = mode === "shared" ? `/api/shared-reports/${resourceId}/matches` : `/api/reports/${resourceId}/matches`;
  return <main className={`ds-page ${mode === "shared" ? "shared-report-page" : "workspace-report-page"}`} lang={lang} dir={dir}><ReportWorkspace blocks={document.blocks} primaryProducts={report.primaryProducts} resourceId={resourceId} privatePublicId={mode === "workspace" ? report.run.publicId || resourceId : undefined} matchesEndpoint={matchesEndpoint} mode={mode} primaryDomain={report.run.primaryDomain} observedAt={report.run.updatedAt} reportStatus={report.run.status} reportEvents={report.events || []} documentVersion={report.documentSchemaVersion} ar={ar} onToggleLocale={() => setLocaleOverride(ar ? "en" : "ar")} /></main>;
}

export default function StoredReportPage({ params }: { params: Promise<{ publicId: string }> | { publicId: string } }) {
  return <StoredReportClient params={params} mode="workspace" />;
}
