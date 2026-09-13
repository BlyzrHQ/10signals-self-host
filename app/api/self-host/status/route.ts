import { localHttpOrigin, localHttpRequestAllowed } from "../../../lib/local-http.ts";
import { localResearchStatus } from "../../../lib/local-report-dispatch.ts";

export async function GET(request: Request) {
  if (!localHttpOrigin()) return new Response(null, { status: 404 });
  if (!localHttpRequestAllowed(request)) return new Response(null, { status: 403 });
  return Response.json({ research: localResearchStatus() }, { headers: { "Cache-Control": "no-store" } });
}
