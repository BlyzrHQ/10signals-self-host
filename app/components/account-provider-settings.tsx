"use client";
import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Settings = { configured: boolean; lastFour: string; version: string | null; updatedAt: string | null };
type State = { settings: Settings; available: boolean; requiredModels: string[] };

export function AccountProviderSettings({ ar = false }: { ar?: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/provider", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error || "Provider settings are unavailable."); return body as State; })
      .then(setState).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Provider settings are unavailable."); });
    return () => controller.abort();
  }, []);
  async function update(method: "POST" | "DELETE") {
    if (!state) return;
    setBusy(true); setError(""); setMessage("");
    const body = JSON.stringify({ expectedVersion: state.settings.version, ...(method === "POST" ? { apiKey: apiKey.trim() } : {}) });
    setApiKey("");
    try {
      const response = await fetch("/api/account/provider", { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not update provider settings.");
      setState({ ...state, settings: result.settings }); setConfirmRemove(false);
      setMessage(method === "DELETE" ? (ar ? "تم حذف المفتاح من هذا الحساب." : "Key removed from this account.") : (ar ? "تم التحقق من المفتاح والوصول للنماذج وحفظه. يمكنك الآن إنشاء تقرير." : "Key and model access checked. Saved for your account. You can now create a report."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Provider settings are unavailable."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void update("POST"); }
  return <section className="acct-section" aria-labelledby="provider-title">
    <div className="acct-head"><h2 className="ds-h3" id="provider-title">{ar ? "مزود الذكاء الاصطناعي" : "AI provider"}</h2><span className="ds-tag">OpenAI</span></div>
    <p>{ar ? "استخدم مفتاح OpenAI الخاص بك لتشغيل تقارير حسابك على هذا التثبيت. لا يُستخدم حساب 10Signals المستضاف." : "Use your own OpenAI API key to run your account’s reports on this installation. This does not connect to the hosted 10Signals service."}</p>
    <p className="ds-note">{ar ? "يتم حفظ المفتاح مشفراً هنا، ولا تتم مشاركته مع الحسابات الأخرى. تُرسل طلبات البحث إلى OpenAI وتُحتسب على حسابك لديهم." : "Your key is stored encrypted on this installation and is not shared with other accounts. Research requests go to OpenAI and are billed to your OpenAI account."}</p>
    {error && <p className="ds-alert" role="alert">{error}</p>}
    {message && <p className="ds-alert" role="status">{message}</p>}
    {!state && !error && <p role="status">{ar ? "جارٍ التحميل…" : "Loading provider settings…"}</p>}
    {state && <>
      <p>{state.settings.configured ? <>{ar ? "المفتاح المحفوظ ينتهي بـ" : "Saved key ending in"} <code>{state.settings.lastFour}</code></> : (ar ? "لم تتم إضافة مفتاح لهذا الحساب بعد." : "No key has been added to this account yet.")}</p>
      {!state.available && <p className="ds-alert" role="alert">{ar ? "عامل البحث غير جاهز. شغّل خدمات Docker ثم أعد تحميل الصفحة." : "The provider vault is not ready. Start the Docker services, check the worker, then reload this page."}</p>}
      <form onSubmit={submit} className="acct-form">
        <label className="acct-field" htmlFor="provider-api-key">{state.settings.configured ? (ar ? "استبدال مفتاح OpenAI" : "Replace OpenAI API key") : (ar ? "مفتاح OpenAI API" : "OpenAI API key")}</label>
        <input className="ds-input" id="provider-api-key" type="password" autoComplete="new-password" spellCheck={false} autoCapitalize="none" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="sk-…" maxLength={1024} required disabled={busy || !state.available} aria-describedby="provider-check-note" />
        <p className="ds-note" id="provider-check-note">{ar ? "يتحقق الزر من صلاحية المفتاح والوصول للنماذج دون تشغيل تقرير. يتم التحقق من الرصيد عند إنشاء تقرير." : "Test & save checks authentication and model access without generating a report. It does not verify billing credit or guarantee a successful report."}</p>
        <button className="ds-btn ds-btn-primary ds-btn-pill" type="submit" disabled={busy || !state.available || !apiKey.trim()}>{busy ? (ar ? "جارٍ التحقق…" : "Checking…") : (ar ? "اختبار وحفظ" : "Test & save")}</button>
      </form>
      <p className="ds-note">{ar ? "النماذج المطلوبة:" : "Required models:"} {state.requiredModels.map(model => <code key={model} style={{ marginInlineEnd: 8 }}>{model}</code>)}</p>
      {state.settings.configured && <div style={{ marginTop: 24 }}>
        {!confirmRemove ? <button type="button" className="ds-btn ds-btn-pill" disabled={busy} onClick={() => setConfirmRemove(true)}>{ar ? "حذف المفتاح" : "Remove key"}</button> : <>
          <p>{ar ? "حذف المفتاح لهذا الحساب؟ سيحتاج التقرير التالي إلى مفتاح جديد." : "Remove this account’s key? New reports will require a key again."}</p>
          <button type="button" className="ds-btn ds-btn-pill" disabled={busy} onClick={() => void update("DELETE")}>{ar ? "تأكيد الحذف" : "Confirm removal"}</button>{" "}
          <button type="button" className="ds-btn ds-btn-pill" disabled={busy} onClick={() => setConfirmRemove(false)}>{ar ? "إلغاء" : "Cancel"}</button>
        </>}
      </div>}
      <p className="ds-note">{ar ? "التغييرات تسري على التقارير الجديدة والمنتظرة. قد يكتمل التقرير الجاري بالمفتاح المحمّل مسبقاً. حذف المفتاح هنا لا يلغيه في OpenAI." : "Changes apply to new and queued reports. A running report may finish using the key it already loaded. Removing it here does not revoke it at OpenAI."}</p>
      <Link className="ds-btn ds-btn-primary ds-btn-pill" href="/">{ar ? "إنشاء تقرير" : "Create a report"}</Link>{" "}<Link href="/docs/self-host">{ar ? "دليل التثبيت" : "Setup guide"}</Link>
    </>}
  </section>;
}
