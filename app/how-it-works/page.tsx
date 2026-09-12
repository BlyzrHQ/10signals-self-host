import { SiteHeader } from "../components/site-header";
import { HowItWorksSection } from "../components/landing-sections";

export default async function HowItWorksPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const ar = (await searchParams).lang === "ar";
  return <main className="ds-page" lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"}>
    <div className="ds-frame">
      <SiteHeader locale={ar ? "ar" : "en"} current="method" localeHref={ar ? "/how-it-works" : "/how-it-works?lang=ar"} />
      <section className="ds-standalone-hero">
        <p className="ds-kicker ds-kicker-accent">{ar ? "كيف يعمل" : "How it works"}</p>
        <h1 className="ds-h1">{ar ? "المنتجات تقود البحث. والأدلة تقرر ما ننشره." : "Products lead the search. Evidence decides what ships."}</h1>
        <p>{ar ? "لا نطلب منك إدخال المنافسين. نبدأ بكتالوجك العام، ونبحث في السوق حول منتجاته، ونُبقي عدم اليقين ظاهراً." : "10 Signals does not ask you to list competitors. It starts with your public catalog, searches the market around those products, and keeps uncertainty visible."}</p>
      </section>
      <HowItWorksSection ar={ar} heading={false} />
      <section className="ds-method-cards" aria-label={ar ? "الالتزامات وهوية الزاحف" : "Commitments and crawler identity"}>
        <article className="ds-card">
          <p className="ds-kicker">{ar ? "ما لا نفعله أبداً" : "What we never do"}</p>
          <p>{ar ? "لا نخترع الأسعار، ولا نحوّل التغطية المفقودة إلى صفر، ولا ننشر منتج منافس مقبولاً دون سعر عام موجب وعملة مدعومة." : "We do not invent prices, call missing coverage zero, or publish an accepted competitor product without a finite positive public price and a supported currency."}</p>
          <a href="https://myjam.co.uk" target="_blank" rel="noreferrer">{ar ? "افتح كتالوج MyJam المصدر" : "Inspect the MyJam source catalog"} ↗</a>
        </article>
        <article className="ds-card">
          <p className="ds-kicker">{ar ? "هوية الزاحف وإيقافه" : "Crawler identity and opt-out"}</p>
          <p>{ar ? "نطلب الصفحات العامة بهوية MarketSignal/1.0، ونحترم robots.txt وحدود الطلبات. يمكن لمالك الموقع إيقاف الزحف بإضافة القواعد التالية." : "Public pages are requested as MarketSignal/1.0. We honor robots.txt and bounded request limits. Site owners can opt out with the following rules."}</p>
          <pre><code>{"User-agent: MarketSignal\nDisallow: /"}</code></pre>
        </article>
      </section>
    </div>
  </main>;
}
