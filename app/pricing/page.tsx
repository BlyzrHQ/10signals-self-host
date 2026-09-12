import { SiteHeader } from "../components/site-header";
import { CheckoutButton } from "../components/checkout-button";
import { PLANS, PlanCard, PricingGrid, PricingHeading, planName } from "../components/landing-sections";
import { hostedBillingEnabled } from "../lib/billing-plans";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const ar = (await searchParams).lang === "ar";
  const billingEnabled = hostedBillingEnabled();
  return <main className="ds-page" lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"}>
    <div className="ds-frame">
      <SiteHeader locale={ar ? "ar" : "en"} current="pricing" localeHref={ar ? "/pricing" : "/pricing?lang=ar"} />
      <section className="ds-standalone-hero">
        <p className="ds-kicker ds-kicker-accent">{ar ? "الخطط والأسعار" : "Plans & pricing"}</p>
        <h1 className="ds-h1">{ar ? "اختر عمق المقارنة الذي تحتاجه." : "Choose the comparison depth you need."}</h1>
        <p>{ar ? "يستهدف كل تقرير عدداً محدداً من مقارنات المنتجات الصالحة والمُسعّرة حسب الخطة. قد يظهر المنتج نفسه أمام عدة بدائل منافسة مختلفة." : "Each report targets the plan's number of valid, priced product-to-rival comparisons. One product can appear against several different rival alternatives."}</p>
      </section>
      <section id="pricing" className="ds-pricing">
        <PricingHeading ar={ar} pill={billingEnabled ? undefined : <span className="ds-tag-dashed">{ar ? "أسعار مستهدفة — الفوترة غير مفعلة" : "Launch targets — billing not active"}</span>} />
        <PricingGrid>
          {PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} ar={ar} id={`plan-${plan.id}`}
            action={billingEnabled ? <CheckoutButton plan={plan.id} ar={ar} label={ar ? `اختر ${planName(plan, ar)}` : `Choose ${plan.name}`} /> : undefined} />)}
        </PricingGrid>
        {!billingEnabled && <p className="ds-note ds-pricing-note">{ar ? "الأسعار مستهدفة للإطلاق. الفوترة المستضافة غير مفعلة في هذا النشر، فلا تُحصَّل أي رسوم." : "Prices are launch targets. Hosted billing is not enabled on this deployment, so nothing is charged."}</p>}
        <p className="ds-note ds-pricing-note">{ar ? "لا توجد رسوم تجاوز تلقائية. تتوقف التقارير الجديدة عند بلوغ حد خطتك حتى دورة الفوترة التالية أو تغيير الخطة." : "No automatic overage charges. New reports pause at your plan limit until the next billing period or a plan change."}</p>
      </section>
    </div>
  </main>;
}
