"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Connection = { id: string; name: string; scopes: string[]; expiresAt: string; status: string; lastUsedAt: string | null };
type State = { endpoint: string; connections: Connection[] };
const URL = "/api/account/mcp-connections";
async function request(method = "GET", body?: Record<string, unknown>) {
  const response = await fetch(URL, { method, cache: "no-store", credentials: "same-origin", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "MCP connections are unavailable.");
  return result;
}
export function AccountLocalMcp({ ar = false }: { ar?: boolean }) {
  const [state, setState] = useState<State | null>(null), [name, setName] = useState(""), [access, setAccess] = useState("read"), [days, setDays] = useState(30);
  const [token, setToken] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  useEffect(() => { let active = true; request().then(result => { if (active) setState(result); }).catch(() => { if (active) setError("MCP connections are unavailable."); }); return () => { active = false; }; }, []);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setToken(""); setMessage("");
    try { const result = await request("POST", { name, access, expiresInDays: days }); setToken(result.token); setName(""); setState(await request()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create connection."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError(""); setMessage(""); setToken("");
    try { await request("DELETE", { id }); setState(await request()); setMessage(ar ? "تم إلغاء الاتصال." : "Connection revoked. New requests with its token are rejected. A report already started may continue."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke connection."); }
    finally { setBusy(false); }
  }
  return <section className="acct-section" aria-labelledby="local-mcp-title">
    <div className="acct-head"><h2 id="local-mcp-title" className="ds-h3">{ar ? "اتصالات MCP المحلية" : "Local MCP connections"}</h2><span className="ds-tag">MCP</span></div>
    <p>{ar ? "اربط وكيلاً يعمل على جهازك بهذا الحساب المحلي. هذا مستقل عن خدمة 10Signals المستضافة." : "Connect an agent on your computer to this local account. This is separate from the hosted 10Signals service."}</p>
    <p className="ds-note">{ar ? "يستخدم الوكيل رمز اتصال، وليس مفتاح OpenAI. تظل التقارير ومفتاح المزود مرتبطة بحسابك هنا." : "The agent uses a connection token, not your OpenAI key. Reports and provider credentials remain tied to your account here. Cloud agents cannot reach localhost."}</p>
    {error && <p role="alert" className="ds-alert">{error}</p>}{message && <p role="status" className="ds-alert">{message}</p>}
    {!state && !error && <p role="status">Loading connections…</p>}
    {state && <>
      <p>{ar ? "عنوان الخادم" : "Server URL"}: <code>{state.endpoint}</code></p>
      <p className="ds-note">Streamable HTTP · Bearer token · {ar ? "للجهاز المحلي فقط" : "Local computer only"}</p>
      <button className="ds-btn ds-btn-pill" type="button" onClick={() => {
        const config = { mcpServers: { "tensignals-local": { type: "http", url: state.endpoint, headers: { Authorization: "Bearer ${TEN_SIGNALS_MCP_TOKEN}" } } } };
        const url = window.URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "10signals.mcp.json"; link.click();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }}>{ar ? "تنزيل إعدادات Claude" : "Download Claude configuration"}</button>
      <form className="acct-form" onSubmit={create}>
        <label className="ds-field">{ar ? "اسم الاتصال" : "Connection name"}<input className="ds-input" value={name} onChange={event => setName(event.target.value)} required maxLength={60} placeholder="My agent" disabled={busy} /></label>
        <label className="ds-field">{ar ? "الصلاحيات" : "Access"}<select className="ds-input" value={access} onChange={event => setAccess(event.target.value)} disabled={busy}>
          <option value="read">{ar ? "قراءة التقارير فقط" : "Read reports only"}</option><option value="full">{ar ? "إنشاء وقراءة التقارير" : "Create and read reports"}</option>
        </select></label>
        <label className="ds-field">{ar ? "الصلاحية" : "Expires after"}<select className="ds-input" value={days} onChange={event => setDays(Number(event.target.value))} disabled={busy}>{[7,30,90].map(day => <option key={day} value={day}>{day} {ar ? "يوماً" : "days"}</option>)}</select></label>
        {access === "full" && <p className="ds-note">{ar ? "يسمح هذا للوكيل بإنشاء تقارير باستخدام مفتاح OpenAI الخاص بحسابك. قد تترتب رسوم على حسابك لدى OpenAI." : "This lets the agent create reports using your account’s saved OpenAI key. Research is billed to your OpenAI account. Only grant this to an agent you trust."}</p>}
        <button className="ds-btn ds-btn-primary ds-btn-pill" disabled={busy || !name.trim()}>{busy ? "Working…" : (ar ? "إنشاء اتصال" : "Create connection")}</button>
      </form>
      {token && <div className="ds-alert" role="status" style={{ marginTop: 20 }}>
        <p>{ar ? "انسخ الرمز الآن؛ لن يُعرض مرة أخرى. لا تشاركه في الدردشة أو Git." : "Copy this token now; it will not be shown again. Do not share it in chat or commit it to Git."}</p>
        <input aria-label="New MCP connection token" type="password" value={token} readOnly autoComplete="off" className="ds-input" />
        <button className="ds-btn ds-btn-pill" type="button" onClick={async () => { try { await navigator.clipboard.writeText(token); setMessage("Token copied."); } catch { setError("Clipboard unavailable. Select and copy the token from the field."); } }}>Copy token</button>{" "}
        <button className="ds-btn ds-btn-pill" type="button" onClick={() => setToken("")}>Dismiss</button>
      </div>}
      <p><Link href="/docs/local-mcp">{ar ? "إعداد Claude أو Codex واختبار الاتصال" : "Set up Claude or Codex and test the connection"} →</Link></p>
      <div className="acct-rows">{state.connections.length === 0 ? <p>No connections yet.</p> : state.connections.map(connection => <div className="acct-report" key={connection.id}>
        <div><strong>{connection.name}</strong><p className="ds-note">{connection.scopes.includes("reports:create") ? "Create and read" : "Read-only"} · {connection.status} · Expires {new Date(connection.expiresAt).toLocaleDateString()}</p></div>
        {connection.status === "active" && <button className="ds-btn ds-btn-pill" type="button" disabled={busy} onClick={() => void revoke(connection.id)}>Revoke</button>}
      </div>)}</div>
    </>}
  </section>;
}
