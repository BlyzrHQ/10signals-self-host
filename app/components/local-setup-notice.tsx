"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export function LocalSetupNotice() {
  const [state, setState] = useState("");
  useEffect(() => {
    if (document.body.dataset.localSelfHost !== "true") return;
    const controller = new AbortController();
    fetch("/api/self-host/status", { signal: controller.signal, cache: "no-store" })
      .then(async response => response.ok ? response.json() : null)
      .then(value => { if (value?.research) setState(value.research); }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!state || state === "ready") return null;
  return <aside className="ds-alert" role="status"><strong>Local installation: {state === "disabled" ? "research not configured" : "research worker unavailable"}.</strong>{" "}
    {state === "disabled" ? "Add your provider key with docker compose run --rm setup --set-key, then run docker compose up -d --wait." : "Run docker compose up -d --wait in your installation folder, then refresh this page."}{" "}
    <Link href="/docs/self-host">Setup guide</Link>. Your saved reports are unchanged.
  </aside>;
}
