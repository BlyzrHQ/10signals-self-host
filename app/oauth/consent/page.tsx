"use client";

import { SiteHeader } from "../../components/site-header";
import { useEffect, useMemo, useState } from "react";
import { accountAuthClient } from "../../lib/account-auth-client.ts";
import {
  MCP_AUTHORIZATION_SCOPES,
  MCP_SCOPE_DETAILS,
  mcpClientIdentity,
  type McpResourceScope,
} from "../../lib/mcp-oauth-shared.ts";

type PublicClient = {
  client_id?: string;
  client_name?: string;
  client_uri?: string;
};

export default function OAuthConsentPage() {
  const [client, setClient] = useState<PublicClient | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useMemo(() => typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search), []);
  const clientId = query.get("client_id") || "";
  const requestedScopes = [...new Set((query.get("scope") || "").split(/\s+/).filter(Boolean))];
  const unsupportedScopes = requestedScopes.filter((scope) => !MCP_AUTHORIZATION_SCOPES.includes(scope as never));
  const identity = mcpClientIdentity(clientId, client?.client_name);
  const visibleError = !clientId ? "This authorization request is missing its client identity." : error;

  useEffect(() => {
    let active = true;
    if (!clientId) return;
    void fetch(`/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("The requesting client could not be verified against its metadata document.");
        const value = await response.json() as PublicClient;
        if (active) setClient(value);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "The requesting client is unavailable.");
      });
    return () => { active = false; };
  }, [clientId]);

  async function decide(accept: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await accountAuthClient.oauth2.consent({ accept });
      if (result.error) throw new Error(result.error.message || "Authorization could not be completed.");
      const response = result.data as { redirect_uri?: string; url?: string } | null;
      const redirect = response?.redirect_uri || response?.url;
      if (!redirect) throw new Error("The authorization server did not return a safe continuation URL.");
      window.location.assign(redirect);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authorization could not be completed.");
      setBusy(false);
    }
  }

  return <main className="ds-page acct-page oauth-consent-page-ds" lang="en" dir="ltr">
    <div className="ds-frame consent-nav"><SiteHeader compact /></div>
    <section className="consent-frame" aria-labelledby="consent-title">
      <div className="acct-kicker-row"><p className="ds-label">{identity.verified ? "Connect the 10 Signals CLI" : "Connect an AI client"}</p></div>
      <h1 className="ds-h1-xs" id="consent-title">Allow access to your account?</h1>
      <div className="consent-client">
        <strong>{identity.name}</strong>
        <code className="acct-code acct-code-line" dir="ltr">{identity.clientId || "Missing client ID"}</code>
        <span className="ds-note" dir="ltr">Host: {identity.host || "unknown"} · {identity.verified ? "Verified 10 Signals client" : "Self-asserted, unverified identity"}</span>
      </div>
      <p className="consent-lead">{identity.verified ? "This first-party CLI will use only the permissions listed below." : "Only approve this request if the client ID host is the one you intended to connect."}</p>
      <div className="consent-scopes">
        {requestedScopes.filter((scope): scope is McpResourceScope => scope in MCP_SCOPE_DETAILS).map((scope) => <article className="consent-scope" key={scope}>
          <strong>{MCP_SCOPE_DETAILS[scope].title}</strong>
          <p>{MCP_SCOPE_DETAILS[scope].description}</p>
        </article>)}
        {requestedScopes.includes("offline_access") && <article className="consent-scope"><strong>Stay connected</strong><p>Use a rotating refresh token so the client can reconnect without asking for your password.</p></article>}
      </div>
      {unsupportedScopes.length > 0 && <p className="ds-alert acct-alert" role="alert"><span aria-hidden="true">⚠</span><span>This request includes unsupported access: {unsupportedScopes.join(", ")}.</span></p>}
      {visibleError && <p className="ds-alert acct-alert" role="alert"><span aria-hidden="true">⚠</span><span>{visibleError}</span></p>}
      <div className="consent-actions">
        <button className="ds-btn ds-btn-primary ds-btn-pill" type="button" disabled={busy || !client || unsupportedScopes.length > 0} onClick={() => decide(true)}>{busy ? "Please wait…" : "Allow access"}</button>
        <button className="ds-btn ds-btn-pill" type="button" disabled={busy} onClick={() => decide(false)}>Deny</button>
      </div>
      <p className="ds-note">10 Signals never gives this client your password. You can revoke access from Account → Connected apps.</p>
    </section>
  </main>;
}
