"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { readJsonResponse } from "../lib/json-response";

/* Shared report primitives from the supplied 10 Signals design: the four evidence states (glyph + fill + words,
   never colour alone), recommendation source tags, the match verdict mark, the breadcrumb header, the
   edge-state card and the decision header's "Next moves" list. */

export type EvidenceState = "observed" | "inferred" | "limited" | "unavailable";
export const EVIDENCE_GLYPH: Record<EvidenceState, string> = { observed: "●", inferred: "◐", limited: "◔", unavailable: "○" };

export function evidenceState(value: unknown): EvidenceState {
  const key = String(value || "").toLowerCase().trim();
  if (key === "observed") return "observed";
  if (key === "limited") return "limited";
  if (key === "unavailable") return "unavailable";
  return "inferred";
}

export function evidenceStateLabel(state: EvidenceState, ar: boolean) {
  const labels: Record<EvidenceState, [string, string]> = {
    observed: ["Observed", "رُصد"], inferred: ["Inferred", "مستنتج"], limited: ["Limited", "محدود"], unavailable: ["Unavailable", "غير متاح"],
  };
  return labels[state][ar ? 1 : 0];
}

export function EvidenceTag({ state, label, small = false, title }: { state: EvidenceState; label: ReactNode; small?: boolean; title?: string }) {
  return <span className={`ds-tag ds-tag-${state}${small ? " ds-tag-sm" : ""}`} title={title}><span aria-hidden="true">{EVIDENCE_GLYPH[state]}</span>{label}</span>;
}

export function EvidenceLegend({ ar }: { ar: boolean }) {
  return <div className="ds-legend">
    <span className="ds-label">{ar ? "الأدلة" : "Evidence"}</span>
    <span className="ds-tag ds-tag-observed">● {ar ? "رُصد" : "Observed"}</span>
    <span className="ds-tag ds-tag-inferred">◐ {ar ? "مستنتج" : "Inferred"}</span>
    <span className="ds-tag ds-tag-limited">◔ {ar ? "محدود" : "Limited"}</span>
    <span className="ds-tag ds-tag-unavailable">○ {ar ? "غير متاح" : "Unavailable"}</span>
    <span className="ds-end">{ar ? "◐ يشير إلى حكم بمساعدة الذكاء الاصطناعي" : "◐ marks AI-assisted judgement"}</span>
  </div>;
}

export type ActionSource = "ai" | "deterministic";

export function sourceTagCopy(source: ActionSource, ar: boolean) {
  return source === "ai"
    ? { label: ar ? "مسودة AI" : "AI-drafted", title: ar ? "صاغها مخطط الإجراءات بالذكاء الاصطناعي؛ راجعها قبل التنفيذ" : "Drafted by the AI action planner; review before acting" }
    : { label: ar ? "قاعدة" : "Rule-based", title: ar ? "قاعدة حتمية من القيم المرصودة" : "Deterministic rule from observed values" };
}

export function SourceTag({ source, ar }: { source: ActionSource; ar: boolean }) {
  const copy = sourceTagCopy(source, ar);
  return <span className={`ds-tag ${source === "ai" ? "ds-tag-ai" : "ds-tag-rule"}`} title={copy.title}>{copy.label}</span>;
}

export function VerdictMark({ same, label }: { same: boolean; label: string }) {
  return <span className={`ds-verdict${same ? " ds-verdict-same" : ""}`}><i aria-hidden="true" />{label}</span>;
}

export function EdgeStateCard({ where, state, stateLabel, title, body, bodyDir, actions, children, role, id }: {
  where: string; state: EvidenceState; stateLabel: string; title: string; body: ReactNode; bodyDir?: "ltr"; actions?: ReactNode; children?: ReactNode; role?: "alert" | "status"; id?: string;
}) {
  return <article className="rp-state" role={role} id={id}>
    <div className="rp-state-head"><p className="ds-label">{where}</p><EvidenceTag state={state} label={stateLabel} small /></div>
    <h3 className="rp-state-title">{title}</h3>
    <p className="rp-state-body" dir={bodyDir}>{body}</p>
    {actions && <p className="rp-state-actions">{actions}</p>}
    {children}
  </article>;
}

export function ActionSeparator() { return <i aria-hidden="true">·</i>; }

type AccountStatus = { authenticated?: boolean; user?: { name?: string; email?: string } };

function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 2).toUpperCase();
  return (email.trim().slice(0, 2) || "10").toUpperCase();
}

/** Breadcrumb header from the design: brand / domain … "Observed <date> · Report v1" · avatar. */
export function ReportCrumbs({ domain, observedAt, version, ar, onToggleLocale, mode }: { domain: string; observedAt: string; version?: number; ar: boolean; onToggleLocale?: () => void; mode: "workspace" | "shared" | "stopped" }) {
  const [account, setAccount] = useState<AccountStatus | null>(null);
  useEffect(() => {
    if (mode === "shared") return;
    let current = true;
    fetch("/api/billing/subscription", { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } })
      .then(async (response) => response.ok ? readJsonResponse<AccountStatus>(response, "Account") : null)
      .then((payload) => { if (current && payload) setAccount(payload); })
      .catch(() => { /* Public viewers simply do not get an avatar. */ });
    return () => { current = false; };
  }, [mode]);
  const observed = Date.parse(observedAt);
  const observedLabel = Number.isFinite(observed) ? new Intl.DateTimeFormat(ar ? "ar" : "en", { day: "numeric", month: "short", year: "numeric" }).format(observed) : "";
  const user = account?.authenticated ? account.user : undefined;
  return <header className="ds-crumbs rp-crumbs">
    <Link className="ds-crumbs-brand" href={ar ? "/?lang=ar" : "/"}><span className="ds-dot-sm" aria-hidden="true" /><span className="ds-wordmark-sm">10 Signals</span></Link>
    <span aria-hidden="true">/</span>
    <span className="rp-crumbs-domain">{domain}</span>
    <span className="ds-spacer" />
    <span className="rp-crumbs-meta">{observedLabel && <>{ar ? "رُصد" : "Observed"} {observedLabel}</>}{version ? <> · {ar ? "تقرير" : "Report"} v{version}</> : null}{mode === "shared" && <> · {ar ? "مشترك · للقراءة فقط" : "Shared · read only"}</>}</span>
    {onToggleLocale && <button type="button" className="ds-lang" lang={ar ? "en" : "ar"} onClick={onToggleLocale} aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}>{ar ? "English" : "العربية"}</button>}
    {user
      ? <Link className="ds-avatar" href="/account" aria-label={ar ? "الحساب" : "Account"} title={ar ? "الحساب" : "Account"}>{initials(user.name || "", user.email || "")}</Link>
      : mode !== "shared" && <Link className="rp-crumbs-signin" href="/account">{ar ? "تسجيل الدخول" : "Sign in"}</Link>}
  </header>;
}

export type NextMove = { key: string; text: string; source: ActionSource; href?: string };

export function NextMoves({ moves, ar, hint }: { moves: NextMove[]; ar: boolean; hint?: ReactNode }) {
  return <>
    <p className="ds-kicker" style={{ marginBottom: 8 }}>{ar ? "الخطوات التالية" : "Next moves"}</p>
    {moves.length
      ? <ol className="rp-next-moves">{moves.map((move) => <li key={move.key}><span>{move.href ? <a href={move.href}>{move.text}</a> : move.text}</span><SourceTag source={move.source} ar={ar} /></li>)}</ol>
      : <p className="rp-next-moves-empty">{ar ? "لا توجد خطوة مثبتة بعد — لم تُقبل مقارنات كافية لاقتراح إجراء." : "No proven move yet — not enough accepted comparisons to suggest an action."}</p>}
    {hint}
  </>;
}
