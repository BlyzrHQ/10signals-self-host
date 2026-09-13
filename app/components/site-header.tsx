import Link from "next/link";
import type { ReactNode } from "react";
import { AccountNavigationLink } from "./account-navigation-link";

type Props = {
  locale?: "en" | "ar";
  current?: "home" | "pricing" | "method" | "account" | "watch" | "cli" | "docs";
  localeHref?: string;
  localeControl?: ReactNode;
  compact?: boolean;
};

/**
 * The landing navigation from the supplied 10 Signals design:
 * glowing dot + wordmark, "How it works" and "Pricing" anchors, sign in, language toggle.
 * Locale remains owned by the page, not this shell.
 */
export function SiteHeader({ locale = "en", current, localeHref, localeControl, compact = false }: Props) {
  const ar = locale === "ar";
  const homeHref = ar ? "/?lang=ar" : "/";
  return <header dir={ar ? "rtl" : "ltr"} className={`site-nav ds-nav${compact ? " site-nav-compact" : ""}`}>
    <Link className="ds-nav-brand site-brand" href={homeHref} aria-label={ar ? "10 Signals — الرئيسية" : "10 Signals home"}>
      <span className="ds-dot" aria-hidden="true" />
      <span className="ds-wordmark">10 Signals</span>
    </Link>
    <nav aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}>
      {!compact && <>
        <Link className="ds-nav-link" href={current === "home" ? "#how" : `${homeHref}#how`} aria-current={current === "method" ? "page" : undefined}>{ar ? "كيف يعمل" : "How it works"}</Link>
        <Link className="ds-nav-link" href={current === "home" ? "#pricing" : `${homeHref}#pricing`} aria-current={current === "pricing" ? "page" : undefined}>{ar ? "الأسعار" : "Pricing"}</Link>
      </>}
      <AccountNavigationLink ar={ar} />
      <Link className="ds-nav-link" href="/docs" aria-current={current === "docs" ? "page" : undefined}>{ar ? "التوثيق" : "Docs"}</Link>
      {current === "watch" && <Link className="ds-nav-link" href="/price-watch" aria-current="page">{ar ? "مراقبة الأسعار" : "Price watch"}</Link>}
      {localeControl || (localeHref && <Link className="ds-lang site-language" href={localeHref} lang={ar ? "en" : "ar"} aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}>{ar ? "English" : "العربية"}</Link>)}
    </nav>
  </header>;
}
