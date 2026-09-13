import { accountContext, type AccountContext } from "../../../lib/account-auth.ts";
import { localHttpRequestAllowed } from "../../../lib/local-http.ts";
import { mutationRequestIsSameOrigin, readBoundedJsonObject } from "../../../lib/request-json.ts";
import { McpCommandStoreError } from "../../../lib/mcp-command-store.ts";
import { localMcpOrigin, openLocalMcpDatabase, listLocalMcpConnections, createLocalMcpConnection, revokeLocalMcpConnection, LocalMcpError } from "../../../lib/local-mcp-store.ts";

const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie", "Referrer-Policy": "no-referrer" };
type Services = { origin: () => string | null; authorize: (request: Request) => Promise<AccountContext | null>; openDatabase: typeof openLocalMcpDatabase };
export async function localMcpConnectionsRoute(request: Request, deps: Services = { origin: localMcpOrigin, authorize: accountContext, openDatabase: openLocalMcpDatabase }) {
  const origin = deps.origin();
  if (!origin) return new Response(null, { status: 404, headers });
  const fail = (status: number, errorCode: string, error: string) => Response.json({ ok: false, errorCode, error }, { status, headers });
  if (!localHttpRequestAllowed(request) || (request.method !== "GET" && !mutationRequestIsSameOrigin(request))) return fail(403, "invalid-origin", "Invalid request origin.");
  let database;
  try {
    const account = await deps.authorize(request);
    if (!account) return fail(401, "authentication-required", "Sign in to manage MCP connections.");
    const owner = { workspaceId: account.workspaceId, userId: account.user.id };
    database = await deps.openDatabase();
    if (request.method === "GET") return Response.json({ ok: true, endpoint: `${origin}/mcp`, connections: listLocalMcpConnections(database, owner, origin) }, { headers });
    if (!["POST", "DELETE"].includes(request.method)) return fail(405, "method-not-allowed", "Method not allowed.");
    let body;
    try { body = await readBoundedJsonObject(request, 2048); } catch { return fail(400, "invalid-json", "Invalid or oversized request."); }
    const fields = request.method === "DELETE" ? ["id"] : ["name", "access", "expiresInDays"];
    if (Object.keys(body).some(key => !fields.includes(key))) return fail(400, "invalid-settings", "Unknown connection setting.");
    if (request.method === "DELETE") { revokeLocalMcpConnection(database, owner, origin, body.id); return Response.json({ ok: true }, { headers }); }
    return Response.json({ ok: true, endpoint: `${origin}/mcp`, ...createLocalMcpConnection(database, owner, origin, body) }, { status: 201, headers });
  } catch (error) {
    if (error instanceof LocalMcpError) return fail(error.code === "not-found" ? 404 : error.code === "invalid-account" ? 403 : 400, error.code, error.message);
    if (error instanceof McpCommandStoreError && error.code === "rate-limit-exceeded") return fail(429, error.code, "Please wait a minute before creating another connection.");
    return fail(503, "connections-unavailable", "MCP connections are temporarily unavailable.");
  } finally { database?.close(); }
}
export const GET = (request: Request) => localMcpConnectionsRoute(request);
export const POST = (request: Request) => localMcpConnectionsRoute(request);
export const DELETE = (request: Request) => localMcpConnectionsRoute(request);
