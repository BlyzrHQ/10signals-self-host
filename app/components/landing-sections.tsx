import type { ReactNode } from "react";
import Link from "next/link";
import { BILLING_PLANS, type BillingPlan } from "../lib/billing-plans";

/**
 * Landing sections shared with the standalone /how-it-works and /pricing routes.
 * Server-safe (no hooks) so the same markup renders in both places.
 * Copy and layout follow the supplied 10 Signals design; plans are the real BILLING_PLANS.
 */

export const HOW_STEPS: Record<"en" | "ar", { n: string; title: string; body: string }[]> = {
  en: [
    { n: "01", title: "Enter a domain or URL", body: "We normalize it and create a durable saved report you can return to." },
    { n: "02", title: "Crawl permitted public pages", body: "Sitemaps, structured data and storefront feeds build a catalog of products, prices, images and identifiers." },
    { n: "03", title: "Discover and verify competitors", body: "Every candidate is crawled and independently verified on category, region and product overlap before it is called a competitor." },
    { n: "04", title: "Match products", body: "Lexical and semantic retrieval, then structured AI assessment with deterministic safety rules: same product, close substitute, or not comparable." },
    { n: "05", title: "Benchmark and save", body: "The public shopping experience is scored across all companies and the report is saved at a shareable URL." },
  ],
  ar: [
    { n: "01", title: "أدخل نطاقاً أو رابطاً", body: "نطبّعه وننشئ تقريراً محفوظاً دائماً." },
    { n: "02", title: "نفحص الصفحات العامة", body: "خرائط الموقع والبيانات المنظمة وخلاصات المتجر تبني كتالوج منتجاتك وأسعارك." },
    { n: "03", title: "نكتشف المنافسين ونتحقق منهم", body: "يُزحف كل مرشح ويُتحقق منه بشكل مستقل قبل تسميته منافساً." },
    { n: "04", title: "نطابق المنتجات", body: "تشابه معجمي ودلالي، ثم تقييم AI منظم مع قواعد أمان حتمية: المنتج نفسه، بديل قريب، أو غير قابل للمقارنة." },
    { n: "05", title: "نقيس التجربة ونحفظ", body: "تُقاس تجربة التسوق العامة عبر الشركات، ويُحفظ التقرير في رابط قابل للمشاركة." },
  ],
};

export const PLANS: BillingPlan[] = Object.values(BILLING_PLANS);

const PLAN_NAMES_AR: Record<BillingPlan["id"], string> = { starter: "مبتدئ", solo: "فردي", growth: "نمو", agency: "وكالة" };

export function planName(plan: BillingPlan, ar: boolean) {
  return ar ? PLAN_NAMES_AR[plan.id] : plan.name;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export function HowItWorksSection({ ar, heading = true }: { ar: boolean; heading?: boolean }) {
  return <section id="how" className="ds-how">
    {heading && <h2 className="ds-h2 ds-how-title">{ar ? "كيف يعمل" : "How it works"}</h2>}
    <ol className="ds-how-list">
      {HOW_STEPS[ar ? "ar" : "en"].map((step) => <li key={step.n} className="ds-how-step">
        <span className="ds-how-n ds-num">{step.n}</span>
        <div><p className="ds-how-step-title">{step.title}</p><p className="ds-how-step-body">{step.body}</p></div>
      </li>)}
    </ol>
  </section>;
}

export function PlanCard({ plan, ar, id, action }: { plan: BillingPlan; ar: boolean; id?: string; action?: ReactNode }) {
  const reports = formatCount(plan.reportsPerMonth);
  const products = formatCount(plan.productLimit);
  return <article className="ds-card ds-plan" id={id}>
    <p className="ds-kicker ds-kicker-accent ds-plan-name">{planName(plan, ar)}</p>
    <p className="ds-plan-price ds-num" dir="ltr">{`$${plan.monthlyPriceUsd}`}</p>
    <p className="ds-plan-unit">{ar ? "شهرياً" : "per month"}</p>
    <p className="ds-plan-body">{ar ? `${reports} تقارير شهرياً، حتى ${products} منتج لكل تقرير.` : `${reports} reports a month, up to ${products} products per report.`}</p>
    {action && <div className="ds-plan-action">{action}</div>}
  </article>;
}

export function PricingGrid({ children }: { children: ReactNode }) {
  return <div className="ds-plans">{children}</div>;
}

export function PricingHeading({ ar, pill }: { ar: boolean; pill?: ReactNode }) {
  return <div className="ds-section-head">
    <h2 className="ds-h2">{ar ? "الأسعار" : "Pricing"}</h2>
    {pill}
  </div>;
}

/** Landing pricing: real plans, "Choose <plan>" pill links to the standalone pricing card. */
export function LandingPricingSection({ ar }: { ar: boolean }) {
  return <section id="pricing" className="ds-pricing">
    <PricingHeading ar={ar} />
    <PricingGrid>
      {PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} ar={ar}
        action={<Link className="ds-btn ds-btn-pill" href={`/pricing${ar ? "?lang=ar" : ""}#plan-${plan.id}`}>{ar ? `اختر ${planName(plan, ar)}` : `Choose ${plan.name}`}</Link>} />)}
    </PricingGrid>
  </section>;
}
