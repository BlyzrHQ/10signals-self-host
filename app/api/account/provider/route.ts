import { accountContext, type AccountContext } from "../../../lib/account-auth.ts";
import { localHttpRequestAllowed } from "../../../lib/local-http.ts";
import { mutationRequestIsSameOrigin, readBoundedJsonObject } from "../../../lib/request-json.ts";
import { accountProviderEnabled, LocalProviderStore, providerDatabasePath, ProviderSettingsError, validProviderKey } from "../../../lib/local-provider-store.ts";
import { checkOpenAIProvider, SELF_HOST_REQUIRED_MODELS } from "../../../lib/check-openai-provider.ts";

const headers = { "Cache-Control": "no-store, max-age=0" };
type Services = { enabled: () => boolean; authorize: (request: Request) => Promise<AccountContext | null>; openStore: () => LocalProviderStore; check: typeof checkOpenAIProvider };
const services = (): Services => ({ enabled: accountProviderEnabled, authorize: accountContext, openStore: () => new LocalProviderStore(providerDatabasePath()), check: checkOpenAIProvider });
const fail = (status: number, errorCode: string, error: string) => Response.json({ ok: false, errorCode, error }, { status, headers });

export async function providerSettingsRoute(request: Request, deps: Services = services()) {
  if (!deps.enabled()) return new Response(null, { status: 404, headers });
  if (!localHttpRequestAllowed(request) || (request.method !== "GET" && !mutationRequestIsSameOrigin(request))) return fail(403, "invalid-origin", "Invalid request origin.");
  let store: LocalProviderStore | undefined;
  try {
    const account = await deps.authorize(request);
    if (!account) return fail(401, "authentication-required", "Sign in to manage your AI provider.");
    const owner = { userId: account.user.id, workspaceId: account.workspaceId };
    store = deps.openStore();
    if (request.method === "GET") return Response.json({ ok: true, provider: "openai", settings: store.summary(owner), available: Boolean(store.vault()), requiredModels: SELF_HOST_REQUIRED_MODELS }, { headers });
    let body: Record<string, unknown>;
    try { body = await readBoundedJsonObject(request, 2048); }
    catch { return fail(400, "invalid-json", "Invalid or oversized settings request."); }
    if (Object.keys(body).some(key => !["apiKey", "expectedVersion"].includes(key))) return fail(400, "invalid-settings", "Only an OpenAI API key can be configured here.");
    store.assertVersion(owner, body.expectedVersion);
    const expected = body.expectedVersion as string | null;
    if (request.method === "DELETE") return Response.json({ ok: true, settings: store.remove(owner, expected) }, { headers });
    if (request.method !== "POST") return fail(405, "method-not-allowed", "Method not allowed.");
    if (!validProviderKey(body.apiKey)) return fail(400, "invalid-key", "Enter a valid OpenAI API key.");
    if (!store.vault()) throw new ProviderSettingsError("unavailable");
    store.claimCheck(owner);
    const checked = await deps.check(body.apiKey);
    if (checked.ok === false) return fail(checked.code === "provider-unavailable" ? 503 : 400, checked.code, checked.message);
    return Response.json({ ok: true, settings: store.save(owner, body.apiKey, expected), message: "Key and model access checked. Saved for your account. Billing credit and report execution are checked when you run a report." }, { headers });
  } catch (error) {
    if (error instanceof ProviderSettingsError && error.code === "conflict") return fail(409, "settings-changed", "Settings changed in another request. Refresh and try again.");
    if (error instanceof ProviderSettingsError && error.code === "rate-limited") return fail(429, "check-rate-limited", "Please wait a minute before checking another key.");
    return fail(503, "provider-settings-unavailable", "Provider settings are unavailable. Check that the local worker and its private-key volume are healthy.");
  } finally { store?.close(); }
}
export const GET = (request: Request) => providerSettingsRoute(request);
export const POST = (request: Request) => providerSettingsRoute(request);
export const DELETE = (request: Request) => providerSettingsRoute(request);
