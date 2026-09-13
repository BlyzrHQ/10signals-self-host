import { localHttpOrigin, localHttpRequestAllowed } from "../../../lib/local-http.ts";
import { localResearchStatus } from "../../../lib/local-report-dispatch.ts";
import { accountContext } from "../../../lib/account-auth.ts";
import { accountProviderEnabled, LocalProviderStore, providerDatabasePath } from "../../../lib/local-provider-store.ts";

export async function GET(request: Request) {
  if (!localHttpOrigin()) return new Response(null, { status: 404 });
  if (!localHttpRequestAllowed(request)) return new Response(null, { status: 403 });
  if (accountProviderEnabled() && localResearchStatus() === "ready") {
    const account = await accountContext(request);
    if (!account) return Response.json({ research: "sign-in-required", accountProvider: true }, { headers: { "Cache-Control": "no-store" } });
    let store: LocalProviderStore | undefined;
    try { store = new LocalProviderStore(providerDatabasePath()); return Response.json({ research: store.vault() && store.summary({ workspaceId: account.workspaceId, userId: account.user.id }).configured ? "ready" : "disabled", accountProvider: true }, { headers: { "Cache-Control": "no-store" } }); }
    catch { return Response.json({ research: "unavailable", accountProvider: true }, { headers: { "Cache-Control": "no-store" } }); }
    finally { store?.close(); }
  }
  return Response.json({ research: localResearchStatus(), ...(accountProviderEnabled() ? { accountProvider: true } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
