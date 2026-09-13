"use client";

import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { AccountProviderSettings } from "../components/account-provider-settings";
import { FormEvent, useEffect, useState } from "react";
import { accountAuthClient } from "../lib/account-auth-client.ts";
import { newestAccountReportPath, safeAccountReturnPath } from "../lib/account-report-redirect.ts";

const PLANS = [
  { id: "starter", name: "Starter", monthlyPriceUsd: 8, reportsPerMonth: 5, productLimit: 20 },
  { id: "solo", name: "Solo", monthlyPriceUsd: 29, reportsPerMonth: 10, productLimit: 50 },
  { id: "growth", name: "Growth", monthlyPriceUsd: 79, reportsPerMonth: 40, productLimit: 500 },
  { id: "agency", name: "Agency", monthlyPriceUsd: 199, reportsPerMonth: 120, productLimit: 1_000 },
];

type Locale = "en" | "ar";
type Section = "reports" | "plan" | "profile" | "keys" | "apps" | "provider";

/* Copy from the supplied 10 Signals design (en + ar). Strings that described planned-only
   behaviour in the prototype are replaced by the real product behaviour. */
const COPY = {
  en: {
    yourAccount: "Your 10 Signals account", signUpTitle: "Create your account.", signInTitle: "Welcome back.",
    signSub: "Your reports, plan limits and API keys stay attached to one private account.",
    name: "Name", email: "Email", password: "Password", createAccount: "Create account", signInCta: "Sign in",
    haveAccount: "Already have an account? Sign in", newHere: "New here? Create an account", pleaseWait: "Please wait…",
    signNote: "Reports belong to your account and stay private unless you explicitly share them.",
    account: "Account", openLatestReport: "Open latest report", signOut: "Sign out", loading: "Loading your account…",
    myReports: "My reports", reportsUsed: (used: number, limit: number) => `${used} of ${limit} reports this period`, newReport: "New report",
    reportsNote: "Your reports are private. Use a report's Share control to create or revoke a public link.",
    noReports: "No reports yet. Run one from the home page to see it here.", noPlanReports: "Choose a plan to start creating hosted reports.",
    planUsage: "Plan & usage", currentPlan: "Current plan", noPlan: "No active plan", month: "month", reportsThisPeriod: "Reports this period",
    productsPerReport: "Products per report", renews: "Period resets", cancels: "Cancels", currentLabel: "Current plan", choosePlan: "Choose",
    manageBilling: "Manage billing", managePriceWatchers: "Manage price watchers",
    credits: (remaining: number, allocation: number) => `${remaining} of ${allocation} price-check credits remaining`,
    billingNote: "Billing is handled by Stripe. Plan changes, invoices and cancellation live in the billing portal.",
    billingNoteNoPlan: "Billing is handled by Stripe. Choosing a plan opens a secure checkout.",
    profile: "Profile", language: "Language", changePassword: "Change password", cancel: "Cancel", currentPassword: "Current password",
    newPassword: "New password", updatePassword: "Update password", passwordUpdated: "Password updated", save: "Save changes", saved: "Saved",
    emailNote: "Email is your sign-in identity and cannot be changed here.",
    apiKeys: "API keys", apiKeysBody: "Create an account-scoped key when a browser login is not practical. Report creation still uses your plan allowance. The full key is shown once.",
    keyName: "Key name", access: "Access", accessFull: "Create and read reports", accessRead: "Read reports only", expires: "Expires", days: "days", year: "year",
    createKey: "Create key", copyKeyNow: "Copy this key now. It will not be shown again.", copyKey: "Copy key", keyCopied: "Copied", revoke: "Revoke",
    noKeys: "No API keys have been created.", expiresOn: "Expires", lastUsed: "Last used", neverUsed: "Never used", revoked: "Revoked", expired: "Expired",
    connectedApps: "Connected apps", connectedBody: "The 10 Signals CLI, Claude, Codex and other clients appear here after you approve access. Client names are self-asserted; check the host before connecting.",
    noApps: "No apps are connected.", verifiedClient: "Verified client", unverifiedIdentity: "Unverified identity", active: "Active", reauth: "Reauthorization required",
    downloadInstaller: "Download customer CLI installer",
    status: { complete: "Complete", limited: "Limited", failed: "Failed", interrupted: "Stopped", running: "Running", queued: "Queued" } as Record<string, string>,
  },
  ar: {
    yourAccount: "حسابك في 10 Signals", signUpTitle: "أنشئ حسابك.", signInTitle: "مرحباً بعودتك.",
    signSub: "تقاريرك وحدود خطتك ومفاتيح API تبقى مرتبطة بحساب خاص واحد.",
    name: "الاسم", email: "البريد الإلكتروني", password: "كلمة المرور", createAccount: "إنشاء حساب", signInCta: "تسجيل الدخول",
    haveAccount: "لديك حساب؟ سجّل الدخول", newHere: "جديد هنا؟ أنشئ حساباً", pleaseWait: "يرجى الانتظار…",
    signNote: "التقارير ملك لحسابك وتبقى خاصة ما لم تشاركها بنفسك.",
    account: "الحساب", openLatestReport: "افتح آخر تقرير", signOut: "تسجيل الخروج", loading: "جارٍ تحميل حسابك…",
    myReports: "تقاريري", reportsUsed: (used: number, limit: number) => `${used} من ${limit} تقارير هذه الفترة`, newReport: "تقرير جديد",
    reportsNote: "تقاريرك خاصة. استخدم زر المشاركة في التقرير لإنشاء رابط عام أو إلغائه.",
    noReports: "لا توجد تقارير بعد. أنشئ تقريراً من الصفحة الرئيسية ليظهر هنا.", noPlanReports: "اختر خطة لبدء إنشاء تقارير مستضافة.",
    planUsage: "الخطة والاستخدام", currentPlan: "الخطة الحالية", noPlan: "لا توجد خطة نشطة", month: "شهر", reportsThisPeriod: "تقارير هذه الفترة",
    productsPerReport: "منتجات لكل تقرير", renews: "تتجدد الفترة", cancels: "تُلغى", currentLabel: "الخطة الحالية", choosePlan: "اختر",
    manageBilling: "إدارة الفوترة", managePriceWatchers: "إدارة مراقبة الأسعار",
    credits: (remaining: number, allocation: number) => `${remaining} من ${allocation} رصيد فحص أسعار متبقٍ`,
    billingNote: "تتم الفوترة عبر Stripe. تغيير الخطة والفواتير والإلغاء من بوابة الفوترة.",
    billingNoteNoPlan: "تتم الفوترة عبر Stripe. اختيار خطة يفتح صفحة دفع آمنة.",
    profile: "الملف الشخصي", language: "اللغة", changePassword: "تغيير كلمة المرور", cancel: "إلغاء", currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة", updatePassword: "تحديث كلمة المرور", passwordUpdated: "تم تحديث كلمة المرور", save: "حفظ التغييرات", saved: "تم الحفظ",
    emailNote: "البريد الإلكتروني هو هوية تسجيل الدخول ولا يمكن تغييره هنا.",
    apiKeys: "مفاتيح API", apiKeysBody: "أنشئ مفتاحاً مرتبطاً بالحساب عندما لا يكون تسجيل الدخول عبر المتصفح عملياً. يُعرض المفتاح الكامل مرة واحدة.",
    keyName: "اسم المفتاح", access: "الصلاحية", accessFull: "إنشاء وقراءة التقارير", accessRead: "قراءة التقارير فقط", expires: "ينتهي", days: "يوماً", year: "سنة",
    createKey: "إنشاء مفتاح", copyKeyNow: "انسخ هذا المفتاح الآن. لن يُعرض مرة أخرى.", copyKey: "نسخ المفتاح", keyCopied: "تم النسخ", revoke: "إلغاء",
    noKeys: "لم يتم إنشاء مفاتيح API.", expiresOn: "ينتهي", lastUsed: "آخر استخدام", neverUsed: "لم يُستخدم", revoked: "ملغى", expired: "منتهٍ",
    connectedApps: "التطبيقات المتصلة", connectedBody: "تظهر هنا أداة 10 Signals وClaude وCodex وغيرها بعد موافقتك على الوصول. أسماء العملاء ذاتية التصريح؛ تحقق من المضيف قبل الاتصال.",
    noApps: "لا توجد تطبيقات متصلة.", verifiedClient: "عميل موثق", unverifiedIdentity: "هوية غير موثقة", active: "نشط", reauth: "يلزم إعادة التفويض",
    downloadInstaller: "تنزيل مثبّت أداة العملاء",
    status: { complete: "مكتمل", limited: "محدود", failed: "فشل", interrupted: "متوقف", running: "قيد التشغيل", queued: "في الانتظار" } as Record<string, string>,
  },
};

type Status = {
  authenticated: boolean;
  mode?: "self-hosted";
  accountProvider?: boolean;
  user?: { name: string; email: string };
  subscription?: { plan: { id: string; name: string; reportsPerMonth: number; productLimit: number; monitoringCredits: number } | null; status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string } | null;
  usage?: { used: number; limit: number };
  monitoringUsage?: { used: number; allocation: number; remaining: number };
};

type ConnectedApp = {
  consentId: string;
  client: { clientId: string; host: string; name: string; verified: boolean };
  scopes: string[];
  connectedAt: string;
  status: "active" | "reauthorization_required";
};

type AccountApiKey = {
  id: string;
  name: string;
  lastFour: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  status: "active" | "expired" | "revoked";
};

type AccountReport = {
  publicId: string;
  primaryDomain: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_TAG: Record<string, { tag: string; glyph: string }> = {
  complete: { tag: "ds-tag-observed", glyph: "●" },
  limited: { tag: "ds-tag-limited", glyph: "◔" },
  failed: { tag: "ds-tag-unavailable", glyph: "○" },
  interrupted: { tag: "ds-tag-unavailable", glyph: "○" },
  running: { tag: "ds-tag-inferred", glyph: "◐" },
  queued: { tag: "ds-tag-inferred", glyph: "◐" },
};

async function jsonRequest(url: string, body?: unknown) {
  const response = await fetch(url, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(result.message || result.error || "The request could not be completed."));
  return result;
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "ar" ? "ar" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return (name.trim() || "A").split(/\s+/).map((word) => word[0] || "").join("").slice(0, 2).toUpperCase();
}

export default function AccountPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [apiKeys, setApiKeys] = useState<AccountApiKey[]>([]);
  const [reports, setReports] = useState<AccountReport[]>([]);
  const [revealedApiKey, setRevealedApiKey] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [section, setSection] = useState<Section>("reports");
  const [keyCopied, setKeyCopied] = useState(false);
  const [mcpCopyStatus, setMcpCopyStatus] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const t = COPY[locale];
  const ar = locale === "ar";

  async function load() {
    const response = await fetch("/api/billing/subscription", { cache: "no-store" });
    const next = response.ok ? await response.json() as Status : { authenticated: false };
    setStatus(next);
    if (next.authenticated) {
      const apps = await fetch("/api/account/connected-apps", { cache: "no-store" });
      if (apps.ok) setConnectedApps(((await apps.json()) as { apps?: ConnectedApp[] }).apps || []);
      const keys = await fetch("/api/account/api-keys", { cache: "no-store" });
      if (keys.ok) setApiKeys(((await keys.json()) as { keys?: AccountApiKey[] }).keys || []);
      const history = await fetch("/api/account/reports", { cache: "no-store", credentials: "same-origin" });
      const payload = await history.json().catch(() => null) as { reports?: AccountReport[] } | null;
      setReports(Array.isArray(payload?.reports) ? payload.reports : []);
    } else {
      setConnectedApps([]);
      setApiKeys([]);
      setReports([]);
      setRevealedApiKey("");
    }
  }
  useEffect(() => {
    let active = true;
    const localeTimer = new URLSearchParams(window.location.search).get("lang") === "ar" ? window.setTimeout(() => setLocale("ar"), 0) : 0;
    const requestedSection = new URLSearchParams(window.location.search).get("section");
    void (async () => {
      const response = await fetch("/api/billing/subscription", { cache: "no-store" });
      const next = response.ok ? await response.json() as Status : { authenticated: false };
      if (!active) return;
      setStatus(next);
      if (next.mode === "self-hosted" && next.accountProvider && requestedSection === "provider") setSection("provider");
      if (next.mode !== "self-hosted" && (requestedSection === "keys" || requestedSection === "apps")) setSection(requestedSection);
      if (next.authenticated) {
        const apps = await fetch("/api/account/connected-apps", { cache: "no-store" });
        if (active && apps.ok) setConnectedApps(((await apps.json()) as { apps?: ConnectedApp[] }).apps || []);
        const keys = await fetch("/api/account/api-keys", { cache: "no-store" });
        if (active && keys.ok) setApiKeys(((await keys.json()) as { keys?: AccountApiKey[] }).keys || []);
        const history = await fetch("/api/account/reports", { cache: "no-store", credentials: "same-origin" });
        const payload = await history.json().catch(() => null) as { reports?: AccountReport[] } | null;
        if (active) setReports(Array.isArray(payload?.reports) ? payload.reports : []);
      }
    })();
    return () => { active = false; window.clearTimeout(localeTimer); };
  }, []);

  function switchLocale(next: Locale) {
    setLocale(next);
    const url = new URL(window.location.href);
    if (next === "ar") url.searchParams.set("lang", "ar"); else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url);
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const credentials = {
        email: String(data.get("email") || ""),
        password: String(data.get("password") || ""),
      };
      const result = mode === "sign-up"
        ? await accountAuthClient.signUp.email({ ...credentials, name: String(data.get("name") || "") })
        : await accountAuthClient.signIn.email(credentials);
      if (result.error) throw new Error(result.error.message || "Authentication failed.");
      const oauthResult = result.data as unknown as { redirect_uri?: string; url?: string } | null;
      const oauthRedirect = oauthResult?.redirect_uri || oauthResult?.url;
      if (oauthRedirect) {
        window.location.assign(oauthRedirect);
        return;
      }
      const requestedPath = safeAccountReturnPath(new URLSearchParams(window.location.search).get("next"));
      if (new URLSearchParams(window.location.search).get("section") === "provider") { window.location.assign("/account?section=provider"); return; }
      if (requestedPath) {
        window.location.assign(requestedPath);
        return;
      }
      const reportsResponse = await fetch("/api/account/reports", { cache: "no-store", credentials: "same-origin" });
      if (reportsResponse.ok) {
        const reportsPath = newestAccountReportPath(await reportsResponse.json().catch(() => null));
        if (reportsPath) {
          window.location.assign(reportsPath);
          return;
        }
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed.");
    } finally { setBusy(false); }
  }

  async function billing(path: "checkout" | "portal", plan?: string) {
    setBusy(true);
    setError("");
    try {
      const result = await jsonRequest(`/api/billing/${path}`, plan ? { plan } : {});
      window.location.assign(String(result.url));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Billing is unavailable.");
      setBusy(false);
    }
  }

  async function createApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setRevealedApiKey("");
    setKeyCopied(false);
    const data = new FormData(form);
    try {
      const response = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") || ""),
          access: String(data.get("access") || "full"),
          expiresInDays: Number(data.get("expiresInDays") || 90),
        }),
      });
      const body = await response.json().catch(() => ({})) as { apiKey?: string; error?: string };
      if (!response.ok || !body.apiKey) throw new Error(body.error || "The API key could not be created.");
      setRevealedApiKey(body.apiKey);
      form.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The API key could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await accountAuthClient.updateUser({ name: String(data.get("name") || "").trim() });
      if (result.error) throw new Error(result.error.message || "The profile could not be saved.");
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 1600);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The profile could not be saved.");
    } finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    const data = new FormData(form);
    try {
      const result = await accountAuthClient.changePassword({
        currentPassword: String(data.get("currentPassword") || ""),
        newPassword: String(data.get("newPassword") || ""),
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message || "The password could not be changed.");
      form.reset();
      setPasswordOpen(false);
      setPasswordUpdated(true);
      window.setTimeout(() => setPasswordUpdated(false), 2400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The password could not be changed.");
    } finally { setBusy(false); }
  }

  async function revoke(url: string, fallback: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || fallback);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const dir = ar ? "rtl" : "ltr";

  if (!status) return <main className="ds-page acct-page account-page-ds" lang={locale} dir={dir}>
    <div className="ds-frame"><SiteHeader compact locale={locale} current="account" /><p className="acct-loading" role="status">{t.loading}</p></div>
  </main>;

  if (!status.authenticated) return <main className="ds-page acct-page account-page-ds" lang={locale} dir={dir}>
    <div className="ds-frame-auth">
      <Link className="ds-crumbs-brand acct-brand" href={ar ? "/?lang=ar" : "/"} aria-label={ar ? "10 Signals — الرئيسية" : "10 Signals home"}><span className="ds-dot-sm" aria-hidden="true" /><span className="ds-wordmark-sm">10 Signals</span></Link>
      <div className="acct-kicker-row"><p className="ds-label">{t.yourAccount}</p></div>
      <h1 className="ds-h1-xs">{mode === "sign-up" ? t.signUpTitle : t.signInTitle}</h1>
      <p className="acct-sub">{t.signSub}</p>
      <form className="acct-form" onSubmit={authenticate}>
        {mode === "sign-up" && <label className="ds-field">{t.name}<input className="ds-input ds-input-sm" name="name" required autoComplete="name" /></label>}
        <label className="ds-field">{t.email}<input className="ds-input ds-input-sm" name="email" required type="email" autoComplete="email" dir="ltr" /></label>
        <label className="ds-field">{t.password}<input className="ds-input ds-input-sm" name="password" required type="password" minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} dir="ltr" /></label>
        {error && <p className="ds-alert acct-alert" role="alert"><span aria-hidden="true">⚠</span><span>{error}</span></p>}
        <button className="ds-btn ds-btn-primary ds-btn-block acct-submit" type="submit" disabled={busy}>{busy ? t.pleaseWait : mode === "sign-up" ? t.createAccount : t.signInCta}</button>
      </form>
      <button className="ds-btn-link acct-switch" type="button" onClick={() => { setError(""); setMode(mode === "sign-up" ? "sign-in" : "sign-up"); }}>{mode === "sign-up" ? t.haveAccount : t.newHere}</button>
      <p className="ds-note acct-note-bottom">{t.signNote}</p>
    </div>
  </main>;

  const user = status.user || { name: "", email: "" };
  const displayName = user.name || user.email || t.account;
  const plan = status.subscription?.plan || null;
  const used = status.usage?.used || 0;
  const limit = status.usage?.limit || plan?.reportsPerMonth || 0;
  const share = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const periodEnd = status.subscription?.currentPeriodEnd ? formatDate(status.subscription.currentPeriodEnd, locale) : "";
  const latestReportPath = newestAccountReportPath({ reports });
  const creditsRemaining = status.monitoringUsage?.remaining ?? plan?.monitoringCredits ?? 0;
  const creditsAllocation = status.monitoringUsage?.allocation || plan?.monitoringCredits || 0;
  const NAV: Array<[Section, string]> = status.mode === "self-hosted"
    ? [["reports", t.myReports], ["plan", ar ? "التثبيت المحلي" : "Your installation"], ["profile", t.profile]]
    : [["reports", t.myReports], ["plan", t.planUsage], ["profile", t.profile], ["keys", t.apiKeys], ["apps", t.connectedApps]];
  if (status.mode === "self-hosted" && status.accountProvider) NAV.splice(1, 0, ["provider", ar ? "مزود الذكاء الاصطناعي" : "AI provider"]);

  return <main className="ds-page acct-page account-page-ds" lang={locale} dir={dir}>
    <div className="ds-frame">
      <header className="ds-crumbs">
        <Link className="ds-crumbs-brand" href={ar ? "/?lang=ar" : "/"} aria-label={ar ? "10 Signals — الرئيسية" : "10 Signals home"}><span className="ds-dot-sm" aria-hidden="true" /><span className="ds-wordmark-sm">10 Signals</span></Link>
        <span aria-hidden="true">/</span><span>{t.account}</span>
        <span className="ds-spacer" />
        {latestReportPath
          ? <Link className="ds-btn ds-btn-pill" href={latestReportPath}>{t.openLatestReport}</Link>
          : <span className="ds-btn ds-btn-pill" aria-disabled="true">{t.openLatestReport}</span>}
        <button className="ds-btn-ghost" type="button" onClick={async () => { await jsonRequest("/api/auth/sign-out", {}); await load(); }}>{t.signOut}</button>
      </header>
      <div className="acct-identity">
        <span className="ds-avatar-lg" aria-hidden="true">{initials(user.name || user.email)}</span>
        <div><h1 className="acct-name">{displayName}</h1><p className="acct-email" dir="ltr">{user.email}</p></div>
      </div>
      <div className="acct-layout">
        <nav className="acct-nav" aria-label={t.account}>
          {NAV.map(([key, label]) => <button key={key} type="button" aria-current={section === key ? "true" : undefined} onClick={() => setSection(key)}>{label}</button>)}
        </nav>
        <div className="acct-sections">
          {section === "provider" && status.mode === "self-hosted" && status.accountProvider && <AccountProviderSettings ar={ar} />}
          {error && <p className="ds-alert acct-alert" role="alert"><span aria-hidden="true">⚠</span><span>{error}</span></p>}

          {section === "reports" && <section className="acct-section" aria-labelledby="acct-reports-title">
            <div className="acct-head"><h2 className="ds-h3" id="acct-reports-title">{t.myReports}</h2>{plan && <span className="acct-head-note">{t.reportsUsed(used, limit)}</span>}<span className="ds-spacer" /><Link className="ds-btn ds-btn-primary ds-btn-pill acct-btn-accent" href={ar ? "/?lang=ar" : "/"}>+ {t.newReport}</Link></div>
            <div className="acct-rows">
              {reports.map((report) => {
                const state = STATUS_TAG[report.status] || STATUS_TAG.failed;
                return <Link className="acct-report" key={report.publicId} href={`/reports/${report.publicId}?view=products`}>
                  <span className="acct-report-domain ds-ltr" dir="ltr">{report.primaryDomain}</span>
                  <span className={`ds-tag acct-status ${state.tag}`}><span aria-hidden="true">{state.glyph}</span>{t.status[report.status] || report.status}</span>
                  <span className="acct-date">{formatDate(report.createdAt, locale)}</span>
                </Link>;
              })}
              {reports.length === 0 && <p className="acct-empty">{plan || status.mode === "self-hosted" ? t.noReports : t.noPlanReports}</p>}
            </div>
            <p className="ds-note acct-section-note">{t.reportsNote}</p>
          </section>}

          {section === "plan" && status.mode === "self-hosted" && <section className="acct-section"><h2 className="ds-h3">{ar ? "تثبيتك الخاص" : "Your own installation"}</h2><p>{ar ? "تعمل التقارير على بنيتك التحتية. أنت مسؤول عن تكاليف مزود البحث والخادم." : "Reports run on your infrastructure. You pay your own research provider and server costs; no hosted subscription is required."}</p><p>{ar ? "واجهة API وMCP ومراقبة الأسعار المجدولة غير مفعلة في هذه النسخة التجريبية." : "API, MCP and scheduled price watches are not enabled in this self-host candidate yet."}</p><Link href="/docs/self-host">{ar ? "دليل التثبيت" : "Installation guide"}</Link></section>}
          {section === "plan" && status.mode !== "self-hosted" && <section className="acct-section" aria-labelledby="acct-plan-title">
            <div className="acct-head"><h2 className="ds-h3" id="acct-plan-title">{t.planUsage}</h2></div>
            <div className="acct-stats">
              <div className="acct-stat"><p className="ds-label">{t.currentPlan}</p><p className="acct-stat-value">{plan ? plan.name : t.noPlan}</p>{plan && <p className="acct-stat-sub"><span dir="ltr">${PLANS.find((item) => item.id === plan.id)?.monthlyPriceUsd ?? ""}</span> / {t.month} · {status.subscription?.status}</p>}</div>
              <div className="acct-stat"><p className="ds-label">{t.reportsThisPeriod}</p><p className="acct-stat-value">{used} <small>/ {limit}</small></p><div className="acct-bar" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}><span style={{ width: `${share}%` }} /></div></div>
              <div className="acct-stat"><p className="ds-label">{t.productsPerReport}</p><p className="acct-stat-value">{plan ? plan.productLimit.toLocaleString() : "—"}</p>{periodEnd && <p className="acct-stat-sub">{status.subscription?.cancelAtPeriodEnd ? t.cancels : t.renews} {periodEnd}</p>}</div>
            </div>
            <div className="acct-plans">
              {PLANS.map((item) => {
                const current = plan?.id === item.id;
                return <div className={`acct-plan${current ? " acct-plan-current" : ""}`} key={item.id}>
                  <p className="ds-label">{item.name}</p>
                  <p className="acct-plan-price" dir="ltr">${item.monthlyPriceUsd}<span> / {t.month}</span></p>
                  <p className="acct-plan-body">{item.reportsPerMonth} {ar ? "تقارير" : "reports"} · {item.productLimit.toLocaleString()} {ar ? "منتج/تقرير" : "products/report"}</p>
                  {current
                    ? <button className="ds-btn ds-btn-pill acct-plan-btn" type="button" disabled>{t.currentLabel}</button>
                    : <button className="ds-btn ds-btn-pill acct-plan-btn" type="button" disabled={busy} onClick={() => plan ? billing("portal") : billing("checkout", item.id)}>{t.choosePlan}</button>}
                </div>;
              })}
            </div>
            <div className="acct-actions">
              {plan && <button className="ds-btn ds-btn-pill" type="button" disabled={busy} onClick={() => billing("portal")}>{t.manageBilling}</button>}
              {plan && <Link className="ds-btn ds-btn-pill" href="/price-watch">{t.managePriceWatchers}</Link>}
              {plan && <span className="acct-head-note">{t.credits(creditsRemaining, creditsAllocation)}</span>}
              <p className="ds-note">{plan ? t.billingNote : t.billingNoteNoPlan}</p>
            </div>
          </section>}

          {section === "profile" && <section className="acct-section" aria-labelledby="acct-profile-title">
            <h2 className="ds-h3 acct-head" id="acct-profile-title">{t.profile}</h2>
            <form onSubmit={saveProfile}>
              <div className="acct-profile">
                <label className="ds-field">{t.name}<input className="ds-input ds-input-white" name="name" defaultValue={user.name} key={user.name} required maxLength={120} autoComplete="name" /></label>
                <label className="ds-field">{t.email}<input className="ds-input ds-input-white" name="email" value={user.email} readOnly dir="ltr" autoComplete="email" title={t.emailNote} /></label>
                <div className="ds-field"><span id="acct-language-label">{t.language}</span><span className="acct-seg" role="group" aria-labelledby="acct-language-label"><button type="button" aria-pressed={!ar} onClick={() => switchLocale("en")} lang="en">English</button><button type="button" aria-pressed={ar} onClick={() => switchLocale("ar")} lang="ar">العربية</button></span></div>
                <div className="ds-field"><span>{t.password}</span><button className="ds-btn ds-btn-pill acct-start" type="button" aria-expanded={passwordOpen} onClick={() => setPasswordOpen(!passwordOpen)}>{passwordUpdated ? t.passwordUpdated : passwordOpen ? t.cancel : t.changePassword}</button></div>
              </div>
              <div className="acct-actions"><button className="ds-btn ds-btn-primary ds-btn-pill acct-btn-save" type="submit" disabled={busy}>{profileSaved ? t.saved : t.save}</button></div>
            </form>
            {passwordOpen && <form className="acct-password" onSubmit={changePassword}>
              <label className="ds-field">{t.currentPassword}<input className="ds-input ds-input-white" name="currentPassword" type="password" required autoComplete="current-password" dir="ltr" /></label>
              <label className="ds-field">{t.newPassword}<input className="ds-input ds-input-white" name="newPassword" type="password" required minLength={8} autoComplete="new-password" dir="ltr" /></label>
              <button className="ds-btn ds-btn-primary ds-btn-pill acct-btn-save acct-start" type="submit" disabled={busy}>{t.updatePassword}</button>
            </form>}
          </section>}

          {section === "keys" && <section className="acct-section" aria-labelledby="acct-keys-title">
            <div className="acct-head acct-head-tight"><h2 className="ds-h3" id="acct-keys-title">{t.apiKeys}</h2></div>
            <p className="acct-body">{t.apiKeysBody}</p>
            <p className="ds-note"><Link href="/docs/api">{ar ? "دليل الربط الخارجي خطوة بخطوة" : "External API: setup and first request"}</Link></p>
            <form className="acct-key-form" onSubmit={createApiKey}>
              <label className="ds-field">{t.keyName}<input className="ds-input ds-input-white" name="name" required maxLength={60} placeholder="Nightly research agent" /></label>
              <label className="ds-field">{t.access}<select className="ds-select" name="access" defaultValue="full"><option value="full">{t.accessFull}</option><option value="read">{t.accessRead}</option></select></label>
              <label className="ds-field">{t.expires}<select className="ds-select" name="expiresInDays" defaultValue="90"><option value="30">30 {t.days}</option><option value="90">90 {t.days}</option><option value="365">1 {t.year}</option></select></label>
              <button className="ds-btn ds-btn-primary ds-btn-pill acct-btn-key" type="submit" disabled={busy}>{t.createKey}</button>
            </form>
            {revealedApiKey && <div className="acct-reveal" role="status">
              <p>{t.copyKeyNow}</p>
              <div className="acct-reveal-row"><code className="acct-code acct-code-line" dir="ltr">{revealedApiKey}</code><button className="ds-btn ds-btn-pill" type="button" onClick={() => { void navigator.clipboard.writeText(revealedApiKey); setKeyCopied(true); window.setTimeout(() => setKeyCopied(false), 1600); }}>{keyCopied ? t.keyCopied : t.copyKey}</button></div>
              <p className="ds-note" dir="ltr">This key connects an external client to your account. It is not a Trigger key. Start with the read-only check in <Link href="/docs/api">the API guide</Link>.</p>
            </div>}
            <div className="acct-rows">
              {apiKeys.map((key) => {
                const active = key.status === "active";
                const meta = active
                  ? `${t.expiresOn} ${formatDate(key.expiresAt, locale)}`
                  : key.status === "revoked" ? t.revoked : t.expired;
                const usage = key.lastUsedAt ? `${t.lastUsed} ${formatDate(key.lastUsedAt, locale)}` : t.neverUsed;
                return <div className="acct-row" key={key.id}>
                  <span><span className="acct-row-title">{key.name}</span><span className="acct-row-sub" dir="ltr">•••• {key.lastFour} · {key.scopes.includes("reports:create") ? t.accessFull : t.accessRead}</span></span>
                  <span className="acct-row-meta">{meta} · {usage}</span>
                  {active ? <button className="ds-btn ds-btn-pill ds-btn-muted" type="button" disabled={busy} onClick={() => void revoke(`/api/account/api-keys/${encodeURIComponent(key.id)}`, "The API key could not be revoked.")}>{t.revoke}</button> : <span />}
                </div>;
              })}
              {apiKeys.length === 0 && <p className="acct-empty">{t.noKeys}</p>}
            </div>
          </section>}

          {/* CONNECTED APPS */}
          {section === "apps" && <section className="acct-section" aria-labelledby="acct-apps-title">
            <div className="acct-head acct-head-tight"><h2 className="ds-h3" id="acct-apps-title">{t.connectedApps}</h2></div>
            <p className="acct-body">{t.connectedBody}</p>
            <p className="ds-note">{ar ? "اتصال خارجي بحسابك عبر OAuth، وليس بمفتاح Trigger." : "External account access through OAuth—not a Trigger key. Start with read-only scopes."}</p>
            <div className="acct-reveal-row"><code className="acct-code" dir="ltr">https://10signals.xyz/mcp</code><button className="ds-btn ds-btn-pill" type="button" onClick={async () => {
              try { await navigator.clipboard.writeText("https://10signals.xyz/mcp"); setMcpCopyStatus(ar ? "تم نسخ الرابط" : "MCP endpoint copied"); }
              catch { setMcpCopyStatus(ar ? "انسخ الرابط يدوياً" : "Clipboard unavailable; copy the endpoint manually."); }
            }}>{ar ? "نسخ رابط MCP" : "Copy MCP endpoint"}</button></div>
            <p className="ds-note" role="status" aria-live="polite">{mcpCopyStatus}</p>
            <div className="acct-rows">
              {connectedApps.map((app) => {
                const active = app.status === "active";
                return <div className="acct-row" key={app.consentId}>
                  <span><span className="acct-row-title">{app.client.name}</span><span className="acct-row-sub" dir="ltr">{app.client.host} · {app.client.verified ? t.verifiedClient : t.unverifiedIdentity}</span></span>
                  <span className={`ds-tag ${active ? "ds-tag-observed" : "ds-tag-limited"}`}><span aria-hidden="true">{active ? "●" : "◔"}</span>{active ? t.active : t.reauth}</span>
                  <button className="ds-btn ds-btn-pill ds-btn-muted" type="button" disabled={busy} onClick={() => void revoke(`/api/account/connected-apps/${encodeURIComponent(app.consentId)}`, "The app could not be revoked.")}>{t.revoke}</button>
                </div>;
              })}
              {connectedApps.length === 0 && <p className="acct-empty">{t.noApps}</p>}
            </div>
            <div className="acct-actions"><Link className="ds-btn ds-btn-pill" href="/docs/mcp">{ar ? "دليل ربط MCP" : "Connect an agent: MCP walkthrough"}</Link></div>
          </section>}
        </div>
      </div>
    </div>
  </main>;
}
