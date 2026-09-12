"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { benchmarkGapAction, orderBenchmarkPositions } from "../lib/benchmark-presentation";
import { EdgeStateCard } from "./signal-overview";

type Block = Record<string, unknown>;
type Metric = { score: number | null; sampleSize: number; observed: Record<string, unknown>; formula: string; sourceUrls: string[] };
type DomainBenchmark = {
  domain: string;
  role: string;
  observedAt: string;
  assessmentStatus: "measured" | "not-assessed";
  assessmentReason: string;
  response: Metric;
  images: Metric;
  information: Metric;
  productAccess: Metric;
  purchasePath: Metric & { minimumPublicSteps: number | null };
  trust: Metric;
  mobileAccessibility: Metric;
};

const METRICS = ["response", "images", "information", "productAccess", "purchasePath", "trust", "mobileAccessibility"] as const;
type MetricKey = typeof METRICS[number];
const SCORE_METRICS = ["images", "information", "productAccess", "purchasePath", "trust", "mobileAccessibility"] as const satisfies readonly MetricKey[];

const COPY: Record<MetricKey, { en: string; ar: string; hintEn: string; hintAr: string }> = {
  response: { en: "Crawl response", ar: "استجابة الزحف", hintEn: "Directional crawler proxy, not Core Web Vitals", hintAr: "مؤشر اتجاهي من الزاحف، ليس Core Web Vitals" },
  images: { en: "Image readiness", ar: "جاهزية الصور", hintEn: "Coverage, alt text, responsive markup", hintAr: "التغطية والنص البديل والاستجابة" },
  information: { en: "Product information", ar: "معلومات المنتج", hintEn: "Price, image, description, identifiers", hintAr: "السعر والصورة والوصف والمعرّفات" },
  productAccess: { en: "Product findability", ar: "الوصول للمنتج", hintEn: "How directly products surface", hintAr: "مدى ظهور المنتجات والوصول إليها" },
  purchasePath: { en: "Purchase path", ar: "مسار الشراء", hintEn: "Public cart and checkout controls", hintAr: "عناصر السلة والدفع العامة" },
  trust: { en: "Trust readiness", ar: "جاهزية الثقة", hintEn: "Shipping, returns, contact, policies", hintAr: "الشحن والإرجاع والتواصل والسياسات" },
  mobileAccessibility: { en: "Mobile & access", ar: "الجوال والوصول", hintEn: "Viewport, language, image alternatives", hintAr: "العرض واللغة وبدائل الصور" },
};

function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function list(value: unknown) { return Array.isArray(value) ? value : []; }
function numberOrNull(value: unknown) { const parsed = Number(value); return value !== null && value !== "" && Number.isFinite(parsed) ? parsed : null; }
function safeUrl(value: unknown) { const url = typeof value === "string" ? value : ""; return /^https?:\/\/[^\s]+$/i.test(url) ? url : ""; }
function metric(value: unknown): Metric { const item = object(value); return { score: numberOrNull(item.score), sampleSize: Number(item.sampleSize) || 0, observed: object(item.observed), formula: String(item.formula || ""), sourceUrls: list(item.sourceUrls).map(String).filter(safeUrl) }; }
function domain(value: unknown): DomainBenchmark {
  const item = object(value); const purchase = metric(item.purchasePath);
  const metrics = { response: metric(item.response), images: metric(item.images), information: metric(item.information), productAccess: metric(item.productAccess), purchasePath: { ...purchase, minimumPublicSteps: numberOrNull(object(item.purchasePath).minimumPublicSteps) }, trust: metric(item.trust), mobileAccessibility: metric(item.mobileAccessibility) };
  const assessmentStatus = item.assessmentStatus === "not-assessed" ? "not-assessed" : "measured";
  return { domain: String(item.domain || ""), role: String(item.role || ""), observedAt: String(item.observedAt || ""), assessmentStatus, assessmentReason: String(item.assessmentReason || ""), ...metrics };
}
function median(values: number[]) { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2); }
function score(metricValue: Metric) { return metricValue.score === null ? null : Math.max(0, Math.min(100, metricValue.score)); }
function assessedDate(value: string, ar: boolean) { const parsed = Date.parse(value); return Number.isFinite(parsed) ? new Intl.DateTimeFormat(ar ? "ar" : "en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed) : ""; }

function markerStyle(value: number, centered = false): CSSProperties {
  return { insetInlineStart: centered ? `calc(${value}% - 5px)` : `${value}%` };
}

function benchmarkModel(block: Block | undefined, primaryDomain: string) {
  const domains = list(block?.domains).map(domain).filter((item) => item.domain).sort((left, right) => Number(right.domain === primaryDomain) - Number(left.domain === primaryDomain));
  const primary = domains.find((item) => item.domain === primaryDomain);
  if (!block || !primary) return null;
  const measuredRivals = domains.filter((item) => item.domain !== primaryDomain && item.assessmentStatus === "measured");
  const market = SCORE_METRICS.map((key) => {
    const rivalScores = measuredRivals.map((item) => score(item[key])).filter((value): value is number => value !== null);
    const primaryScore = score(primary[key]);
    const knownScores = rivalScores.length ? [primaryScore, ...rivalScores].filter((value): value is number => value !== null) : [];
    const leader = knownScores.length ? Math.max(...knownScores) : null;
    const leaderDomain = leader === null ? "" : primaryScore === leader ? primaryDomain : measuredRivals.find((item) => score(item[key]) === leader)?.domain || "";
    return { key, median: median(knownScores), leader, leaderDomain, rivalCount: rivalScores.length };
  });
  const positioned = orderBenchmarkPositions(market.map((item) => ({ ...item, yours: score(primary[item.key]) })));
  const behind = positioned.filter((item) => item.band === "behind");
  const ahead = positioned.filter((item) => item.band === "ahead").sort((left, right) => (right.delta || 0) - (left.delta || 0));
  const comparedDimensions = market.filter((item) => item.rivalCount > 0).length;
  const wins = market.filter((item) => item.rivalCount > 0 && score(primary[item.key]) !== null && score(primary[item.key]) === item.leader).length;
  return { domains, primary, measuredRivals, market, positioned, behind, ahead, comparedDimensions, wins };
}

/** Number of scored dimensions for the tab count, or null when this report predates the benchmark (hollow count). */
export function benchmarkDimensionCount(block: Block | undefined, primaryDomain: string) {
  const model = benchmarkModel(block, primaryDomain);
  return model ? SCORE_METRICS.length : null;
}

/** The largest proven gap as a rule-based next move for the decision header. */
export function benchmarkNextMove(block: Block | undefined, primaryDomain: string, ar: boolean) {
  const model = benchmarkModel(block, primaryDomain);
  const gap = model?.behind[0];
  if (!model || !gap) return null;
  const copy = COPY[gap.key];
  const action = benchmarkGapAction(gap.key, model.primary[gap.key].observed, ar);
  return { key: `benchmark-${gap.key}`, text: `${action} ${ar ? `— ${copy.ar}، أكبر فجوة مثبتة (${Math.abs(gap.delta || 0)} نقطة).` : `— ${copy.en}, your largest proven gap (${Math.abs(gap.delta || 0)} points).`}`, href: "?view=overview" };
}

export function ExperienceBenchmark({ block, primaryDomain, ar }: { block?: Block; primaryDomain: string; ar: boolean }) {
  const model = benchmarkModel(block, primaryDomain);
  if (!model) return <div className="rp-benchmark"><div className="rp-states">
    <EdgeStateCard where={ar ? "المقارنة المعيارية" : "Benchmark"} state="unavailable" stateLabel={ar ? "غير متاح" : "Unavailable"} title={ar ? "تقرير أقدم بدون مقارنة معيارية" : "Older report without benchmark"}
      body={ar ? "هذا التقرير أقدم من قياس تجربة التسوق. شغّل تقريراً جديداً لقياس جاهزية الصور ومعلومات المنتج وسهولة الوصول ومسار الشراء والثقة والجوال مقابل المنافسين الموثقين." : "This report predates the experience benchmark. Run a fresh report to measure image readiness, product information, findability, purchase path, trust and mobile against verified rivals."}
      actions={<Link href="/">{ar ? "شغّل تقريراً جديداً" : "Run a fresh report"}</Link>} />
  </div></div>;

  const { domains, primary, positioned, behind, ahead, comparedDimensions, wins, measuredRivals } = model;
  const gap = behind[0];
  const edge = ahead[0];
  const primaryResponse = numberOrNull(primary.response.observed.medianMs);
  const label = (key: MetricKey) => COPY[key][ar ? "ar" : "en"];
  const hint = (key: MetricKey) => COPY[key][ar ? "hintAr" : "hintEn"];
  const cellClass = (value: number | null) => value === null ? "is-na" : value >= 75 ? "is-strong" : value >= 50 ? "is-middle" : "is-weak";

  return <div className="rp-benchmark">
    <div className="rp-stats">
      <div className="rp-stat"><p className="ds-label">{ar ? "مقاييس تتصدرها" : "Dimensions led"}</p>{comparedDimensions ? <p className="rp-stat-big">{wins}<small>/{comparedDimensions}</small></p> : <p className="rp-stat-text is-hollow">○ {ar ? "لم تُقَس نتائج المنافسين" : "Rival scores not assessed"}</p>}<p className="rp-stat-note">{ar ? `مقابل ${measuredRivals.length} منافسين موثقين` : `vs ${measuredRivals.length} verified rival${measuredRivals.length === 1 ? "" : "s"}`}</p></div>
      <div className="rp-stat"><p className="ds-label">{ar ? "أكبر فجوة مثبتة" : "Largest proven gap"}</p>{gap ? <p className="rp-stat-text">{label(gap.key)}</p> : <p className="rp-stat-text is-hollow">{ar ? "لا فجوة مثبتة" : "No proven gap"}</p>}<p className="rp-stat-note">{gap ? `${Math.abs(gap.delta || 0)} ${ar ? "نقطة خلف وسيط السوق" : "points behind market median"}` : (ar ? "القيم المتاحة لا تثبت تأخراً" : "Available values do not prove a deficit")}</p></div>
      <div className="rp-stat"><p className="ds-label">{ar ? "أقوى ميزة مثبتة" : "Strongest proven edge"}</p>{edge ? <p className="rp-stat-text">{label(edge.key)}</p> : <p className="rp-stat-text is-hollow">{ar ? "لا ميزة مثبتة" : "No proven advantage"}</p>}<p className="rp-stat-note">{edge ? `${edge.delta} ${ar ? "نقطة أمام وسيط السوق" : "points ahead of market median"}` : (ar ? "القيم المتاحة لا تثبت تقدماً" : "Available values do not prove an advantage")}</p></div>
      <div className="rp-stat"><p className="ds-label">{ar ? "استجابة الزحف" : "Crawl response"}</p>{primaryResponse === null ? <p className="rp-stat-text is-hollow">{ar ? "غير مرصود" : "Not observed"}</p> : <p className="rp-stat-big" dir="ltr">{primaryResponse} <small>ms</small></p>}<p className="rp-stat-note">{hint("response")}</p></div>
    </div>

    <section className="rp-fix" aria-label={ar ? "ما يجب إصلاحه وما يجب حمايته" : "What to fix and what to protect"}>
      <div className="rp-fix-head">
        <h3>{ar ? "ما يجب إصلاحه وما يجب حمايته" : "What to fix and what to protect"}</h3>
        <span className="ds-small">{ar ? "الجاهزية من 100. الأرقام هي المرجع؛ العلامات توضح الموضع." : "Readiness out of 100. Numbers are the source of truth; markers show position."}</span>
        <span className="ds-spacer" />
        <span className="rp-fix-legend"><span>◆ {ar ? "أنت" : "You"}</span><span>│ {ar ? "الوسيط" : "Median"}</span><span>○ {ar ? "المتصدر" : "Leader"}</span></span>
      </div>
      <div className="rp-fix-rows">
        {positioned.map((item) => {
          const status = item.band === "unknown"
            ? (ar ? "لم تُقَس نتيجتك" : "Your score was not measured")
            : item.band === "level" ? (ar ? "عند وسيط السوق" : "At market median")
              : item.band === "behind" ? `${Math.abs(item.delta || 0)} ${ar ? "نقطة خلف وسيط السوق" : "points behind market median"}`
                : `${item.delta} ${ar ? "نقطة أمام وسيط السوق" : "points ahead of market median"}`;
          const action = item.band === "behind" ? benchmarkGapAction(item.key, primary[item.key].observed, ar) : item.band === "ahead" ? (ar ? "ميزة مثبتة — حافظ عليها." : "Proven advantage — keep it.") : item.band === "level" ? (ar ? "لا فجوة مثبتة ولا ميزة مثبتة." : "No proven gap, no proven advantage.") : (ar ? "لا يمكن إثبات موضع دون قيمة." : "No position can be proven without a value.");
          return <div className="rp-fix-row" key={item.key}>
            <div><p className="rp-fix-label">{label(item.key)}</p><p className="rp-fix-hint">{hint(item.key)}</p></div>
            <div>
              <div className="ds-track" aria-hidden="true">
                {item.median !== null && <span className="ds-track-median" style={markerStyle(item.median)} />}
                {item.leader !== null && <span className="ds-track-leader" style={markerStyle(item.leader, true)} />}
                {item.yours !== null && <span className="ds-track-you" style={markerStyle(item.yours, true)} />}
              </div>
              <p className="rp-fix-values"><span>{ar ? "أنت" : "You"} <b>{item.yours ?? "—"}</b></span><span>{ar ? "الوسيط" : "Median"} <b>{item.median ?? "—"}</b></span><span>{ar ? "المتصدر" : "Leader"} <b>{item.leader ?? "—"}</b> {item.leaderDomain && <span dir="ltr">({item.leaderDomain === primaryDomain ? (ar ? "أنت" : "you") : item.leaderDomain})</span>}</span></p>
            </div>
            <div><p className="rp-fix-status">{status}</p><p className="rp-fix-action">{action}</p></div>
          </div>;
        })}
      </div>
    </section>

    <section className="rp-scoreboard" aria-label={ar ? "لوحة السوق" : "Market scoreboard"}>
      <div className="rp-scoreboard-head"><h3>{ar ? "لوحة السوق" : "Market scoreboard"}</h3><span className="ds-small">{ar ? "كل شركة، نفس نموذج الأدلة" : "Every company, the same evidence model"}</span></div>
      <div className="rp-scoreboard-scroll">
        <table className="ds-table">
          <thead><tr><th>{ar ? "الشركة" : "Company"}</th>{SCORE_METRICS.map((key) => <th key={key}>{label(key)}</th>)}</tr></thead>
          <tbody>{domains.map((item) => {
            const response = numberOrNull(item.response.observed.medianMs);
            const meta = [item.domain === primaryDomain ? (ar ? "أنت" : "You") : "", item.assessmentStatus === "not-assessed" ? `${ar ? "لم يتم التقييم" : "Not assessed"}${item.assessmentReason ? ` — ${item.assessmentReason}` : ""}` : (assessedDate(item.observedAt, ar) ? `${ar ? "قُيّم" : "Assessed"} ${assessedDate(item.observedAt, ar)}` : ""), response === null ? "" : `${response} ms`].filter(Boolean).join(" · ");
            return <tr key={item.domain} className={item.domain === primaryDomain ? "ds-row-you" : undefined}>
              <th scope="row"><span dir="ltr">{item.domain}</span><small>{meta}</small></th>
              {SCORE_METRICS.map((key) => { const value = item.assessmentStatus === "not-assessed" ? null : score(item[key]); return <td key={key} className={cellClass(value)}>{value === null ? (ar ? "غير مقيّم" : "Not assessed") : value}</td>; })}
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    <details className="ds-details rp-method">
      <summary>{ar ? "كيف حُسب هذا، وما لا يمكنه إثباته" : "How this was calculated, and what it cannot prove"}</summary>
      <ul>
        <li>{ar ? "الدرجات من صفحات عامة عُيّنت أثناء هذا الزحف؛ حجم العينة ظاهر لكل مقياس." : "Scores come from public pages sampled during this crawl; sample sizes are shown per metric below and in the CSV."}</li>
        <li>{ar ? "استجابة الزحف هي وسيط زمن استجابة HTML من موقع الزاحف. ليست Core Web Vitals." : "Crawl response is the median HTML response time from the crawler’s location. It is not Core Web Vitals or real-user speed."}</li>
        <li>{ar ? "مسار الشراء يفحص عناصر عامة فقط. لا تُنفذ أي طلبات." : "Purchase path inspects public controls (product link, add-to-cart, cart, checkout). No orders are placed."}</li>
        <li>{ar ? "«لا فجوة مثبتة» يعني أن القيم المتاحة لا تثبتها، لا أنها غير موجودة." : "“No proven gap” or “No proven advantage” means the available values do not establish one, not that none exists."}</li>
        <li>{ar ? "المنافسون هم النطاقات الأكثر ظهوراً في مقارنات المنتجات المقبولة لهذا التقرير." : "Rivals are the domains most represented in this report’s accepted product comparisons."}</li>
        {String(block?.limitations || "") && <li>{String(block?.limitations)}</li>}
      </ul>
      <div className="rp-method-metrics">{METRICS.map((key) => <article key={key}><strong>{label(key)}</strong><p>{primary[key].formula || hint(key)}</p><span>{ar ? "حجم عينة شركتك" : "Your sample"}: {primary[key].sampleSize}{primary[key].sourceUrls[0] && <> · <a href={primary[key].sourceUrls[0]} target="_blank" rel="noreferrer">{ar ? "افتح المصدر ↗" : "Open source ↗"}</a></>}</span></article>)}</div>
    </details>
  </div>;
}
