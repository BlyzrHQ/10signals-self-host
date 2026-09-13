"use client";

import { FormEvent, useEffect, useState } from "react";
import { DesignWorkflow } from "./components/design-workflow";
import { SiteHeader } from "./components/site-header";
import { AgentSetup } from "./components/agent-setup";
import { HowItWorksSection, LandingPricingSection } from "./components/landing-sections";
import { postJson } from "./lib/json-response";
import { ReportResearchControls, DEFAULT_RESEARCH_CONTROLS } from "./components/report-research-controls";
import { LocalSetupNotice } from "./components/local-setup-notice";

type Locale = "en" | "ar";
type CreateReportResponse =
  | { ok: true; report: { publicId: string }; job: { dispatched: true; runId: string } }
  | { ok: false; error?: string; publicId?: string };

/**
 * Real, documented figures from the public MyJam run (myjam.co.uk, observed 8 August 2026, limited coverage).
 * The card layout follows the design's "What a report looks like" example; the numbers are not invented.
 */
const PROOF = {
  domain: "myjam.co.uk",
  observed: { en: "8 Aug 2026", ar: "8 أغسطس 2026" },
  headline: {
    en: "Product-led discovery mapped 5 rival storefronts; 282 priced matches across 1,001 catalogued products, limited coverage.",
    ar: "اكتشاف يقوده المنتج رسم 5 متاجر منافسة؛ 282 مطابقة مسعّرة عبر 1,001 منتج مفهرس، بتغطية محدودة.",
  },
  meta: { en: "5 verified competitors · 282 priced matches · 1,001 products observed", ar: "5 منافسين موثقين · 282 مطابقة مسعّرة · 1,001 منتج مرصود" },
  sources: [
    { label: { en: "Largest source of priced matches", ar: "أكبر مصدر للمطابقات المسعّرة" }, domain: "24shopping.shop", count: 140 },
    { label: { en: "Second source of priced matches", ar: "ثاني مصدر للمطابقات المسعّرة" }, domain: "bakkali.app", count: 101 },
  ],
};

function ProofCard({ ar }: { ar: boolean }) {
  const lang = ar ? "ar" : "en";
  return <section className="ds-proof" id="proof">
    <div className="ds-section-head">
      <h2 className="ds-h2">{ar ? "كيف يبدو التقرير" : "What a report looks like"}</h2>
      <span className="ds-section-note">{ar ? "مثال مؤرخ، ليس بياناتك" : "Example, dated, not your data"}</span>
    </div>
    <div className="ds-proof-card">
      <div>
        <div className="ds-proof-head">
          <span className="ds-tag-ink">{ar ? "تقرير مثال" : "Example report"}</span>
          <span className="ds-proof-source"><span className="ds-ltr">{PROOF.domain}</span> · {ar ? "رُصد" : "Observed"} {PROOF.observed[lang]}</span>
        </div>
        <p className="ds-proof-headline">{PROOF.headline[lang]}</p>
        <p className="ds-proof-meta">{PROOF.meta[lang]}</p>
      </div>
      {PROOF.sources.map((source) => <div className="ds-proof-cell" key={source.domain}>
        <p className="ds-kicker">{source.label[lang]}</p>
        <p className="ds-proof-value ds-ltr">{source.domain}</p>
        <p className="ds-proof-sub">{source.count} {ar ? "مطابقة مسعّرة" : "priced matches"}</p>
      </div>)}
    </div>
  </section>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [domain, setDomain] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [research, setResearch] = useState(DEFAULT_RESEARCH_CONTROLS);
  const ar = locale === "ar";

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("lang") !== "ar") return;
    const timer = window.setTimeout(() => setLocale("ar"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = ar ? "rtl" : "ltr";
    return () => {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    };
  }, [ar, locale]);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const primaryDomain = domain.trim();
    if (!primaryDomain) { setAnalysisError(ar ? "أدخل نطاق شركتك أو رابط موقعها." : "Enter your company domain or website URL."); return; }
    setIsAnalyzing(true); setAnalysisError("");
    try {
      const created = await postJson<CreateReportResponse>("/api/reports", { primaryDomain, locale, includeAnalysis: research.includeAnalysis,
        ...(research.closePrice ? { closePricePercent: research.tolerance } : {}) }, "Persistent report creation");
      if (!created.ok) { const failed = created as Extract<CreateReportResponse, { ok: false }>; if (failed.publicId) window.location.assign(`/reports/${failed.publicId}/loading`); else if (/sign in/i.test(failed.error || "")) window.location.assign("/account"); else throw new Error(failed.error || "The background report job could not be started."); return; }
      window.location.assign(`/reports/${created.report.publicId}/loading`);
    } catch (error) { setAnalysisError(error instanceof Error ? error.message : "The report could not be started."); setIsAnalyzing(false); }
  }

  const pillars = ar
    ? [["01 · المنافسون", "منافسون تم التحقق منهم بشكل مستقل مع درجة وسبب التأهل وروابط إلى صفحاتهم."], ["02 · المنتجات", "منتجاتك بجانب منتجات المنافسين المماثلة بأسعارها العامة وحكم المطابقة وفرق سعر آمن."], ["03 · المقارنة المعيارية", "جاهزية الصور ومعلومات المنتج وسهولة الوصول ومسار الشراء والثقة والجوال — أنت مقابل الوسيط والمتصدر."]]
    : [["01 · Competitors", "Independently verified rivals with a score, the reason they qualify, and links to their pages."], ["02 · Products", "Your products next to comparable rival products with public prices, a match verdict and a safe price difference."], ["03 · Benchmark", "Image readiness, product information, findability, purchase path, trust and mobile — you vs market median vs leader."]];

  return <main className="ds-page signals-home" lang={locale} dir={ar ? "rtl" : "ltr"}>
    <div className="ds-frame">
      <SiteHeader locale={locale} current="home" localeControl={<button className="ds-lang site-language" type="button" lang={ar ? "en" : "ar"} onClick={() => setLocale(ar ? "en" : "ar")} aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}>{ar ? "English" : "العربية"}</button>} />

      <section className="ds-hero" id="top">
        <div className="signals-intro">
          <h1 className="ds-h1">{ar ? "اعرف السوق. التقط الإشارة." : <>Know the market.<br />Find your signal.</>}</h1>
          <p className="signals-subtitle">{ar ? "حوّل نطاقاً إلى " : "Turn a domain into "}<span>{ar ? "معلومات تنافسية موثقة." : "competitive intelligence."}</span></p>
          <form className="ds-hero-form" onSubmit={analyze}>
            <label className="sr-only" htmlFor="domain">{ar ? "نطاق شركتك أو رابط الموقع" : "Your company domain or URL"}</label>
            <input id="domain" className="ds-input" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={ar ? "yourstore.com أو رابط كامل" : "yourstore.com or a full URL"} dir="ltr" autoCapitalize="none" autoCorrect="off" />
            <button className="ds-btn ds-btn-primary ds-btn-lg" type="submit" disabled={isAnalyzing}>{isAnalyzing ? (ar ? "جارٍ إنشاء التقرير…" : "Starting report…") : (ar ? "أنشئ التقرير" : "Run report")}</button>
          </form>
          <LocalSetupNotice />
          <p className="ds-note ds-hero-note">{ar ? "صفحات عامة فقط. يستغرق التقرير من 3 إلى 8 دقائق ويُحفظ برابط قابل للمشاركة." : "Public pages only. Reports take 3–8 minutes and save to a shareable link."}</p>
          <div className="ds-hero-research"><ReportResearchControls value={research} onChange={setResearch} disabled={isAnalyzing} ar={ar} /></div>
          {analysisError && <p className="ds-alert ds-hero-error" role="alert">{analysisError}</p>}
        </div>
        <div className="signals-animation-card">
          <div className="signals-card-heading"><span>{ar ? "من النطاق إلى التقرير" : "FROM DOMAIN TO REPORT"}</span><span>{ar ? "مثال توضيحي" : "Illustrative example"}</span></div>
          <DesignWorkflow ar={ar} />
        </div>
      </section>

      <section className="ds-pillars design-pillars">
        {pillars.map(([title, body]) => <article className="ds-card ds-pillar" key={title}><p className="ds-kicker ds-kicker-accent">{title}</p><p className="ds-pillar-body">{body}</p></article>)}
      </section>

      <ProofCard ar={ar} />
      <HowItWorksSection ar={ar} />
      <LandingPricingSection ar={ar} />
      <section className="signals-showcase" aria-label={ar ? "إعداد الوكيل" : "Agent setup"}>
        <AgentSetup ar={ar} />
      </section>
      <footer className="ds-project-footer">
        <p className="signals-badge">{ar ? "مفتوح المصدر 100% · جاهز للوكلاء" : "100% open source · Agent-ready"}</p>
        <nav className="signals-footer-links" aria-label={ar ? "موارد التصميم" : "Design resources"}>
          <a href={ar ? "/design-system?lang=ar" : "/design-system"}>{ar ? "نظام التصميم" : "Design system"}</a>
        </nav>
        <p>{ar ? "أحد مشاريع " : "Part of "}<a href="https://10claws.com" dir="ltr">10claws.com</a>{ar ? <> · <a href="https://bannaa.ai" dir="ltr">bannaa.ai</a></> : " projects"}</p>
      </footer>
    </div>
  </main>;
}
