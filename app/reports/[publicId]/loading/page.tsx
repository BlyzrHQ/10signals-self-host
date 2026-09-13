"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../../../components/site-header";
import { jsonResponseErrorMessage, readJsonResponse } from "../../../lib/json-response";
import { stoppedReportPresentation } from "../../../lib/stopped-report-presentation";

type Event = { sequence: number; idempotencyKey: string; phase: string; status: string; message: string; observedAt?: string };
type Run = { publicId?: string; status: string; currentPhase?: string; primaryDomain: string; errorMessage: string; errorCode?: string; locale: "en" | "ar" };

/* The seven run phases from the design. Real pipeline phases map onto them; advertising is never checked by this
   product, so that phase always renders as "skipped, not checked" (◔) rather than pretending it ran. */
const PHASES = ["Report created", "Crawling the company website", "Building the catalog", "Discovering and verifying competitors", "Checking advertising sources", "Matching products", "Saving the report"];
const PHASES_AR = ["تم إنشاء التقرير", "فحص موقع الشركة", "بناء الكتالوج", "اكتشاف المنافسين والتحقق منهم", "فحص مصادر الإعلانات", "مطابقة المنتجات", "حفظ التقرير"];
const REAL_ORDER = ["queued", "crawl", "competitors", "brief", "products", "matching", "enrichment", "quality", "actions", "ads", "persistence", "complete"];
const DESIGN_PHASE_OF: Record<string, number> = { queued: 0, crawl: 1, brief: 2, products: 2, competitors: 3, ads: 4, matching: 5, enrichment: 5, quality: 5, actions: 5, persistence: 6, complete: 6 };
const ADS_PHASE = 4;
/* Index (in REAL_ORDER) of the last real phase belonging to each design phase; a design phase is done once the run is past it. */
const LAST_REAL_OF = [0, 1, 4, 2, 9, 8, 11];

function visibleEvents(events: Event[]) {
  return events.filter((event) => !event.idempotencyKey.startsWith("ads-") && !event.idempotencyKey.includes("-ads-"));
}

function eventMessage(event: Event | undefined, ar: boolean) {
  if (!event || !ar) return event?.message || (ar ? "جارٍ فتح تشغيل التقرير المحفوظ." : "Opening the saved report run.");
  const messages: Record<string, string> = { "run-created": "تم إنشاء التقرير وبدأ جمع المصادر العامة.", "crawl-started": "نفحص موقعك وصفحات المنتجات العامة.", "crawl-complete": "اكتمل جمع الكتالوج والتحقق من المنافسين.", "matching-started": "نقارن أقوى عائلات المنتجات.", "matching-complete": "اكتملت مطابقة المنتجات وربط المصادر.", "report-saved": "تم حفظ التقرير." };
  return messages[event.idempotencyKey] || event.message;
}

function clock(value: string | undefined, ar: boolean) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat(ar ? "ar" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(parsed) : "";
}

function realIndex(phase: string | undefined) { return REAL_ORDER.indexOf(phase || ""); }

export default function PersistedLoadingPage({ params }: { params: Promise<{ publicId: string }> | { publicId: string } }) {
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [publicId, setPublicId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    let timer = 0;
    Promise.resolve(params).then(({ publicId }) => {
      setPublicId(publicId);
      const poll = async () => {
        let retryable = true;
        try {
          const response = await fetch(`/api/reports/${publicId}`, { cache: "no-store" });
          retryable = response.ok || response.status === 408 || response.status === 429 || response.status >= 500;
          const body = await readJsonResponse<{ ok: boolean; error?: string; report?: { run?: Run; events?: Event[]; document?: unknown } }>(response, "Report progress");
          if (!current) return;
          if (!response.ok || !body.ok) {
            retryable = response.status === 408 || response.status === 429 || response.status >= 500;
            throw new Error(body.error || "The report run could not be opened.");
          }
          if (!body.report?.run) throw new Error("Report progress returned incomplete report data. Run the scan again.");
          setError("");
          setRun(body.report.run);
          setEvents(visibleEvents(body.report.events || []));
          if (["complete", "limited"].includes(body.report.run.status) && body.report.document) window.location.replace(`/reports/${publicId}`);
          else if (!["failed", "interrupted"].includes(body.report.run.status)) timer = window.setTimeout(poll, 1800);
        } catch (cause) {
          if (!current) return;
          setError(jsonResponseErrorMessage(cause, "Report progress"));
          if (retryable) timer = window.setTimeout(poll, 2500);
        }
      };
      void poll();
    });
    return () => { current = false; window.clearTimeout(timer); };
  }, [params]);

  const ar = run?.locale === "ar";
  const stopped = Boolean(run && ["failed", "interrupted"].includes(run.status));
  const saved = Boolean(run && ["complete", "limited"].includes(run.status));
  const labels = ar ? PHASES_AR : PHASES;

  // Highest real phase reached, from the run's current phase and every recorded event.
  const reached = Math.max(realIndex(run?.currentPhase), ...events.map((event) => realIndex(event.phase)), run ? 0 : -1);
  const currentDesign = saved ? PHASES.length : reached < 0 ? -1 : DESIGN_PHASE_OF[REAL_ORDER[reached]] ?? -1;
  const failedDesign = stopped
    ? (run?.errorCode?.includes("crawl") || run?.errorCode === "primary-page-unavailable" ? 1 : Math.max(0, currentDesign))
    : -1;
  const phaseTime = (index: number) => clock([...events].reverse().find((event) => DESIGN_PHASE_OF[event.phase] === index)?.observedAt, ar);
  const phases = labels.map((label, index) => {
    const skipped = index === ADS_PHASE;
    const done = !skipped && (saved || reached > LAST_REAL_OF[index]);
    const failed = stopped && index === failedDesign;
    const active = !saved && !stopped && !done && !skipped && index === currentDesign;
    const state = failed ? "failed" : done ? "done" : active ? "active" : skipped ? "skipped" : "pending";
    const glyph = failed ? "⚠" : done ? "●" : active ? "◐" : skipped ? "◔" : "○";
    return { label: label + (skipped ? (ar ? " — تُخطى، لم تُفحص" : " — skipped, not checked") : ""), glyph, state, meta: done ? phaseTime(index) : active ? (ar ? "جارٍ" : "running") : "" };
  });
  const doneCount = phases.filter((phase) => phase.state === "done").length;
  const percent = Math.round((Math.min(saved ? PHASES.length : doneCount, PHASES.length) / PHASES.length) * 100);
  const currentLabel = labels[Math.max(0, Math.min(currentDesign, PHASES.length - 1))];
  const presentation = run && stopped ? stoppedReportPresentation(run.errorMessage, run.errorCode, ar) : null;
  const latest = eventMessage(events.at(-1), ar);
  const kicker = error && !run
    ? (ar ? "التقرير غير متاح" : "Report unavailable")
    : stopped ? (ar ? "التشغيل يحتاج انتباهاً" : "Run needs attention") : saved ? (ar ? "تم حفظ التقرير — يُفتح الآن" : "Report saved — opening") : (ar ? "نبني خريطة سوقك" : "Building your market map");
  const status = error && !run
    ? error
    : stopped ? (run?.errorMessage || latest)
      : saved ? (ar ? "يُفتح التقرير المحفوظ…" : "Opening the saved report…")
        : run ? `${currentLabel}…` : latest;
  const recent = [...events].slice(-4).reverse();
  const websiteUrl = run?.primaryDomain ? `https://${run.primaryDomain}` : "";

  if (error && !run) return <main className="ds-page" lang="en" dir="ltr">
    <div className="ds-frame-wide"><SiteHeader compact /></div>
    <div className="ds-frame-narrow" style={{ paddingTop: 24 }}>
      <p className="rp-progress-kicker is-error">{kicker}</p>
      <h1 className="ds-h1-md">{ar ? "تعذر فتح التقرير" : "Opening your report"}</h1>
      <p className="rp-progress-status" role="status" aria-live="polite">{status}</p>
      <div className="rp-run-alert-actions"><Link className="ds-btn ds-btn-primary" href="/account">{ar ? "افتح الحساب" : "Open my account"}</Link><Link className="ds-btn" href="/">{ar ? "ابدأ تقريراً جديداً" : "Start a fresh report"}</Link></div>
    </div>
  </main>;

  return <main className="ds-page" lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"}>
    <div className="ds-frame-narrow">
      <Link className="rp-brand" href={ar ? "/?lang=ar" : "/"}><span className="ds-dot" aria-hidden="true" /><span className="ds-wordmark">10 Signals</span><span className="ds-tag-outline">{ar ? "تشغيل مباشر" : "Live run"}</span></Link>
      <p className={`rp-progress-kicker${stopped ? " is-stopped" : ""}`}>{kicker}</p>
      <h1 className="ds-h1-md"><span dir="ltr" style={{ unicodeBidi: "isolate", overflowWrap: "anywhere" }}>{run?.primaryDomain || "…"}</span></h1>
      <p className="rp-progress-status" role="status" aria-live="polite">{status}</p>
      <div className="ds-progress rp-progress-bar" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
      <ol className="rp-phases" aria-label={ar ? "مراحل التشغيل" : "Run phases"}>
        {phases.map((phase, index) => <li key={index} className={`rp-phase is-${phase.state}`}>
          <span className="rp-phase-glyph" aria-hidden="true">{phase.glyph}</span>
          <span className="rp-phase-label">{phase.label}</span>
          <span className="rp-phase-meta">{phase.meta}</span>
        </li>)}
      </ol>
      {stopped && presentation && <div className="rp-run-alert" role="alert">
        <i aria-hidden="true">⚠</i>
        <div>
          <p className="rp-run-alert-title">{presentation.title} — {ar ? `توقف أثناء ${labels[failedDesign] || currentLabel}.` : `stopped while ${(labels[failedDesign] || currentLabel).toLowerCase()}.`}</p>
          <p className="rp-run-alert-body">{presentation.summary}</p>
          <div className="rp-run-alert-actions">
            <Link className="ds-btn ds-btn-primary" href="/">{ar ? "جرّب نطاقاً آخر" : "Try another domain"}</Link>
            {websiteUrl && <a className="ds-btn" href={websiteUrl} target="_blank" rel="noreferrer">{ar ? "افتح الموقع ↗" : "Open website ↗"}</a>}
            {publicId && <Link className="ds-btn" href={`/reports/${publicId}`}>{ar ? "اعرض ما رُصد" : "View what was observed"}</Link>}
          </div>
          {run?.errorMessage && run.errorMessage !== presentation.summary && <details><summary>{ar ? "التفاصيل التقنية" : "Technical detail"}</summary><p>{run.errorMessage}</p></details>}
        </div>
      </div>}
      {error && run && <p className="rp-run-alert-body" role="status">{error}</p>}
      <div className="rp-events">
        <p className="ds-kicker">{ar ? "أحدث الأحداث" : "Recent events"}</p>
        {recent.length
          ? <ul>{recent.map((event) => <li key={event.sequence}><time dateTime={event.observedAt}>{clock(event.observedAt, ar)}</time><span>{eventMessage(event, ar)}</span></li>)}</ul>
          : <p className="rp-events-empty">{ar ? "لم يُسجَّل حدث بعد." : "No event has been recorded yet."}</p>}
        <p className="rp-close-note">{ar ? "يمكنك إغلاق هذه الصفحة. يستمر التقرير ويُحفظ في" : "You can close this tab. The report keeps running and is saved at"} <span>/reports/{publicId || "…"}</span></p>
      </div>
    </div>
  </main>;
}
