"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export function LocalSetupNotice() {
  const [state, setState] = useState("");
  const [accountProvider, setAccountProvider] = useState(false);
  useEffect(() => {
    if (document.body.dataset.localSelfHost !== "true") return;
    const controller = new AbortController();
    fetch("/api/self-host/status", { signal: controller.signal, cache: "no-store" })
      .then(async response => response.ok ? response.json() : null)
      .then(value => { if (value?.research) { setState(value.research); setAccountProvider(value.accountProvider === true); } }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!state || state === "ready") return null;
  if (accountProvider && (state === "disabled" || state === "sign-in-required")) return <aside className="ds-alert" role="status"><strong>Connect your AI provider.</strong>{" "}Create or sign in to your local account, then add your OpenAI key in <Link href="/account?section=provider">Account → AI provider</Link> to generate reports. No worker restart is needed.</aside>;
  return <aside className="ds-alert" role="status"><strong>Local installation: {state === "disabled" ? "research not configured" : "research worker unavailable"}.</strong>{" "}
    {state === "disabled" ? "Add your provider key with docker compose run --rm setup --set-key, then run docker compose up -d --wait." : "Run docker compose up -d --wait in your installation folder, then refresh this page."}{" "}
    <Link href="/docs/self-host">Setup guide</Link>. Your saved reports are unchanged.
  </aside>;
}
