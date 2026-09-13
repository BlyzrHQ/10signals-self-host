"use client";

import { useEffect, useState } from "react";
import { jsonResponseErrorMessage, readJsonResponse } from "../lib/json-response";

type SharePayload = {
  ok: boolean;
  error?: string;
  shared?: boolean;
  publicUrl?: string;
  sharedAt?: string;
};

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* Use the selection fallback. */ }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  try { return document.execCommand("copy"); } catch { return false; } finally { input.remove(); }
}

type ReportShareControlProps = { publicId: string; ar: boolean };

/* Share states from the design: "Share" → "Link copied" (clipboard) / "Copy link manually" (no clipboard API, with an
   inline read-only field). A shared report also exposes "Copy public link" and "Make private" (revokes the link). */
export function ReportShareControl(props: ReportShareControlProps) {
  return <ReportShareControlState key={props.publicId} {...props} />;
}

function ReportShareControlState({ publicId, ar }: ReportShareControlProps) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [state, setState] = useState<"idle" | "copied" | "manual" | "revoked">("idle");
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reports/${publicId}/sharing`, { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" }, signal: controller.signal })
      .then(async (response) => ({ response, body: await readJsonResponse<SharePayload>(response, "Report sharing") }))
      .then(({ response, body }) => {
        if (!response.ok || !body.ok) { setAvailable(false); return; }
        setAvailable(true); setShared(body.shared === true); setPublicUrl(body.publicUrl || "");
      })
      .catch((cause) => { if (!controller.signal.aborted) setMessage(jsonResponseErrorMessage(cause, "Report sharing is unavailable.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [publicId]);

  const copyPublicLink = async (url: string) => {
    setMessage(""); setFallback("");
    if (!url) return;
    if (await copyText(url)) { setState("copied"); window.setTimeout(() => setState("idle"), 2200); }
    else { setState("manual"); setFallback(url); }
  };

  const mutate = async (action: "share" | "unshare") => {
    setBusy(true); setMessage(""); setFallback("");
    try {
      const response = await fetch(`/api/reports/${publicId}/sharing`, {
        method: "POST",
        credentials: "same-origin",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await readJsonResponse<SharePayload>(response, "Report sharing");
      if (!response.ok || !body.ok) throw new Error(body.error || "The report sharing state could not be changed.");
      setShared(body.shared === true); setPublicUrl(body.publicUrl || "");
      if (action === "share") await copyPublicLink(body.publicUrl || "");
      else { setState("revoked"); window.setTimeout(() => setState("idle"), 2600); }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The report sharing state could not be changed."); }
    finally { setBusy(false); }
  };

  const revoke = () => {
    if (!window.confirm(ar ? "إلغاء الرابط العام وجعل التقرير خاصاً؟ لن يعمل الرابط القديم بعد ذلك." : "Make this report private? The current public link will stop working.")) return;
    void mutate("unshare");
  };

  if (loading) return <button type="button" className="ds-btn" disabled aria-label={ar ? "جارٍ تحميل حالة المشاركة" : "Loading sharing status"}>{ar ? "مشاركة" : "Share"}</button>;
  if (!available) return null;
  const shareLabel = state === "copied" ? (ar ? "تم نسخ الرابط" : "Link copied") : state === "manual" ? (ar ? "انسخ الرابط يدوياً" : "Copy link manually") : state === "revoked" ? (ar ? "أصبح خاصاً" : "Now private") : shared ? (ar ? "نسخ الرابط العام" : "Copy public link") : (ar ? "مشاركة" : "Share");
  return <>
    <button type="button" className="ds-btn" disabled={busy} title={shared ? (ar ? "نسخ الرابط العام" : "Copy public link") : (ar ? "مشاركة التقرير" : "Share report")} onClick={() => shared ? void copyPublicLink(publicUrl) : void mutate("share")}>{busy ? (ar ? "جارٍ الإنشاء…" : "Creating…") : shareLabel}</button>
    {shared && <button type="button" className="ds-btn ds-btn-muted" disabled={busy} onClick={revoke}>{ar ? "جعله خاصاً" : "Make private"}</button>}
    {(message || fallback) && <div className="rp-share-status" role="status" aria-live="polite">{message && <span className="rp-hint">{message}</span>}{fallback && <div className="rp-share-fallback"><input value={fallback} readOnly onFocus={(event) => event.currentTarget.select()} aria-label={ar ? "رابط التقرير العام" : "Public report link"} /></div>}</div>}
  </>;
}
