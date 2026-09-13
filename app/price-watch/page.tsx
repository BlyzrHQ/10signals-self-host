"use client";

import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { useCallback, useEffect, useState } from "react";

type Usage = { planTier: string; periodStart: string; periodEnd: string; allocation: number; used: number; remaining: number; projectedDaily: number; projectedMonthly: number };
type Snapshot = { currency: string; amountMicros: number; raw: string; listAmountMicros: number | null; listRaw: string };
type Watcher = {
  id: string; canonicalUrl: string; rivalDomain: string; productName: string; cadence: "hourly" | "daily";
  state: string; pauseReason: string; baseline: Snapshot | null; failureStreak: number; nextCheckAt: string; lastCheckAt: string;
};
type Notification = { id: string; watcherId: string; type: string; title: string; body: string; createdAt: string; read: boolean };
type History = { id: string; kind: string; currency: string; amountMicros: number; raw: string; listAmountMicros: number | null; listRaw: string; observedAt: string };

class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "ApiError"; this.status = status; }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...init, headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers } });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new ApiError(body.error || "The request could not be completed.", response.status);
  return body;
}

function price(snapshot: Snapshot | null) {
  if (!snapshot) return "Baseline pending";
  return `${snapshot.currency} ${(snapshot.amountMicros / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function stateLabel(state: string) {
  return ({ active: "Active", baseline_pending: "Baseline pending", disabled: "Off", paused_credits: "Credits paused", paused_subscription: "Subscription paused", paused_failure: "Needs attention" } as Record<string, string>)[state] || state;
}

/* Evidence-state tags from the design: ● observed (checking), ◐ inferred (baseline pending), ◔ limited (paused), ○ unavailable (off). */
function stateTag(state: string) {
  if (state === "active") return { className: "ds-tag-observed", glyph: "●" };
  if (state === "baseline_pending") return { className: "ds-tag-inferred", glyph: "◐" };
  if (state === "disabled") return { className: "ds-tag-unavailable", glyph: "○" };
  return { className: "ds-tag-limited", glyph: "◔" };
}

export default function PriceWatchPage() {
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [history, setHistory] = useState<Record<string, History[]>>({});
  const [expanded, setExpanded] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [watch, alerts] = await Promise.all([
        api<{ watchers: Watcher[]; usage: Usage }>("/api/price-watch", { signal }),
        api<{ items: Notification[]; unread: number }>("/api/price-watch/notifications", { signal }),
      ]);
      if (signal?.aborted) return;
      setWatchers(watch.watchers); setUsage(watch.usage); setNotifications(alerts.items); setUnread(alerts.unread); setAuthenticated(true);
    } catch (cause) {
      if (signal?.aborted) return;
      setAuthenticated(cause instanceof ApiError ? cause.status !== 401 : true);
      setError(cause instanceof Error ? cause.message : "Price monitoring is unavailable.");
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void load(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  async function mutate(watcher: Watcher, body: Record<string, unknown>) {
    setBusy(watcher.id); setError("");
    try {
      await api(`/api/price-watch/${watcher.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The watcher could not be updated."); }
    finally { setBusy(""); }
  }

  async function remove(watcher: Watcher) {
    if (!window.confirm(`Permanently delete the watcher and history for ${watcher.productName}?`)) return;
    setBusy(watcher.id); setError("");
    try { await api(`/api/price-watch/${watcher.id}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The watcher could not be deleted."); }
    finally { setBusy(""); }
  }

  async function toggleHistory(watcher: Watcher) {
    if (expanded === watcher.id) { setExpanded(""); return; }
    setExpanded(watcher.id);
    if (history[watcher.id]) return;
    try {
      const result = await api<{ history: History[] }>(`/api/price-watch/${watcher.id}?limit=100`);
      setHistory((current) => ({ ...current, [watcher.id]: result.history }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "History could not be loaded."); }
  }

  async function markAlertsRead() {
    const ids = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!ids.length) return;
    try {
      await api("/api/price-watch/notifications", { method: "POST", body: JSON.stringify({ notificationIds: ids }) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Alerts could not be updated."); }
  }

  const alert = error && <p className="ds-alert acct-alert" role="alert"><span aria-hidden="true">⚠</span><span>{error}</span></p>;

  return <main className="ds-page acct-page price-watch-page-ds" lang="en" dir="ltr">
    <div className="ds-frame">
      <SiteHeader current="watch" />
      <section className="watch-hero"><div><p className="ds-kicker">Exact-URL monitoring</p><h1 className="ds-h1-md">Watch the prices that matter.</h1><p>Each credit checks one saved rival product URL. No search, AI, or automatic product expansion runs in the background.</p></div><Link className="ds-btn ds-btn-pill" href="/">Open a report</Link></section>
      {!authenticated ? <section className="ds-card watch-empty"><h2 className="ds-h3">Sign in to your account</h2><p>Price watchers and alerts are private to the account that owns the report.</p>{alert}<Link className="ds-btn ds-btn-primary ds-btn-pill" href="/account?next=%2Fprice-watch">Sign in</Link></section> : <>
        {usage && <section className="acct-stats" aria-label="Monitoring credit balance">
          <div className="acct-stat"><p className="ds-label">Remaining</p><p className="acct-stat-value">{usage.remaining.toLocaleString()} <small>/ {usage.allocation.toLocaleString()}</small></p><p className="acct-stat-sub">credits this billing period</p></div>
          <div className="acct-stat"><p className="ds-label">Used</p><p className="acct-stat-value">{usage.used.toLocaleString()}</p><p className="acct-stat-sub">resets {usage.periodEnd ? new Date(usage.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "with billing"}</p></div>
          <div className="acct-stat"><p className="ds-label">Current pace</p><p className="acct-stat-value">{usage.projectedDaily.toLocaleString()} <small>/ day</small></p><p className="acct-stat-sub">about {usage.projectedMonthly.toLocaleString()} credits per 30 days</p></div>
        </section>}
        {alert}
        <div className="watch-grid">
          <section className="ds-card watch-list" aria-labelledby="watchers-title">
            <div className="acct-head"><h2 className="ds-h3" id="watchers-title">Watchers</h2><span className="acct-head-note">{watchers.length} exact {watchers.length === 1 ? "target" : "targets"}</span></div>
            {watchers.map((watcher) => {
              const on = watcher.state === "active" || watcher.state === "baseline_pending";
              const tag = stateTag(watcher.state);
              return <article className="price-watch-card" key={watcher.id}>
                <div className="watch-top"><div><span className="watch-domain" dir="ltr">{watcher.rivalDomain}</span><strong className="watch-product">{watcher.productName}</strong></div><span className={`ds-tag ${tag.className}`}><span aria-hidden="true">{tag.glyph}</span>{stateLabel(watcher.state)}</span></div>
                <div className="watch-price"><strong dir="ltr">{price(watcher.baseline)}</strong>{watcher.baseline?.listAmountMicros && <small dir="ltr">Regular/list {watcher.baseline.currency} {(watcher.baseline.listAmountMicros / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })}</small>}<small>{watcher.lastCheckAt ? `Checked ${new Date(watcher.lastCheckAt).toLocaleString()}` : "Waiting for the first check"}{watcher.nextCheckAt ? ` · Next ${new Date(watcher.nextCheckAt).toLocaleString()}` : ""}</small></div>
                <div className="watch-controls">
                  <label className="ds-field">Frequency<select className="ds-select" value={watcher.cadence} disabled={busy === watcher.id} onChange={(event) => void mutate(watcher, { cadence: event.target.value })}><option value="hourly">Hourly · 24 credits/day</option><option value="daily">Daily · 1 credit/day</option></select></label>
                  <button className="watch-switch" type="button" role="switch" aria-checked={on} disabled={busy === watcher.id} onClick={() => void mutate(watcher, { action: on ? "disable" : "resume" })}><span aria-hidden="true" /><b>{on ? "Watching" : "Off"}</b></button>
                  <button className="ds-btn ds-btn-pill ds-btn-muted" type="button" disabled={busy === watcher.id} onClick={() => void remove(watcher)}>Delete</button>
                </div>
                {watcher.pauseReason && <p className="watch-reason">{watcher.pauseReason.replace(/[-:]/g, " ")}{watcher.failureStreak ? ` · ${watcher.failureStreak} failures` : ""}</p>}
                <div className="watch-foot"><a href={watcher.canonicalUrl} target="_blank" rel="noreferrer">Open exact product ↗</a><button className="ds-btn-link" type="button" onClick={() => void toggleHistory(watcher)}>{expanded === watcher.id ? "Hide history" : "Price history"}</button></div>
                {expanded === watcher.id && <ol className="watch-history">{(history[watcher.id] || []).map((entry) => <li key={entry.id}><i /><div><strong dir="ltr">{entry.currency} {(entry.amountMicros / 1_000_000).toLocaleString()}</strong><span>{entry.kind.replace(/-/g, " ")}{entry.listAmountMicros ? ` · list ${entry.currency} ${(entry.listAmountMicros / 1_000_000).toLocaleString()}` : ""}</span></div><time>{new Date(entry.observedAt).toLocaleString()}</time></li>)}{history[watcher.id]?.length === 0 && <li className="watch-history-empty">No price changes recorded yet.</li>}</ol>}
              </article>;
            })}
            {!watchers.length && <div className="watch-empty"><h3 className="ds-h3">No watched prices yet</h3><p>Open an owned report and turn on a saved comparison, or watch a fixed snapshot for one rival.</p></div>}
          </section>
          <aside className="ds-card watch-alerts" aria-labelledby="alerts-title">
            <div className="acct-head"><h2 className="ds-h3" id="alerts-title">In-app alerts</h2><span className="ds-spacer" />{unread > 0 && <button className="ds-btn-link" type="button" onClick={() => void markAlertsRead()}>Mark read</button>}</div>
            {notifications.map((item) => <article className={`watch-alert ${item.read ? "read" : "unread"}`} key={item.id}><i /><div><strong>{item.title}</strong><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString()}</time></div></article>)}
            {!notifications.length && <p className="acct-empty">No price alerts yet.</p>}
          </aside>
        </div>
      </>}
    </div>
  </main>;
}
