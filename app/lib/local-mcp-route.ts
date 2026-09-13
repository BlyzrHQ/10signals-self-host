import type { McpHttpHandler } from "@modelcontextprotocol/server";
import { localMcpOrigin, openLocalMcpDatabase, authorizeLocalMcpToken } from "./local-mcp-store.ts";
import { createLocalMcpHandler } from "./local-mcp-server.ts";
import { readBoundedJsonObject } from "./request-json.ts";
import { McpCommandStoreError } from "./mcp-command-store.ts";

const headers = { "Cache-Control": "private, no-store", "Vary": "Authorization", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };
type Services = { origin: () => string | null; openDatabase: typeof openLocalMcpDatabase; handler: (origin: string) => McpHttpHandler };
let cached: { origin: string; handler: McpHttpHandler } | undefined;
function handlerForOrigin(origin: string) {
  if (!cached || cached.origin !== origin) {
    void cached?.handler.close();
    cached = { origin, handler: createLocalMcpHandler(origin) };
  }
  return cached.handler;
}
export async function localMcpRoute(request: Request, services: Services = { origin: localMcpOrigin, openDatabase: openLocalMcpDatabase, handler: handlerForOrigin }) {
  const origin = services.origin();
  if (!origin) return new Response(null, { status: 404, headers });
  // Native clients omit Origin. Only this bearer-authenticated endpoint permits
  // that; session/cookie mutation routes keep their stricter Origin requirement.
  if (request.headers.get("host") !== new URL(origin).host || (request.headers.has("origin") && request.headers.get("origin") !== origin)) {
    return Response.json({ error: "invalid-origin" }, { status: 403, headers });
  }
  const token = /^Bearer ([A-Za-z0-9._-]+)$/.exec(request.headers.get("authorization") || "")?.[1] || "";
  let database;
  try {
    database = await services.openDatabase();
    const authInfo = authorizeLocalMcpToken(database, token, origin);
    if (!authInfo) return Response.json({ error: "invalid-token", message: "Create a local MCP connection in Account → MCP connections and configure its bearer token." },
      { status: 401, headers: { ...headers, "WWW-Authenticate": 'Bearer realm="10signals-local"' } });
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
    if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return new Response(null, { status: 415, headers });
    let parsedBody;
    // The SDK accepts the already parsed body in both protocol eras. Avoid a
    // cloned stream: cancelling one oversized tee branch can await its unread sibling.
    try { parsedBody = await readBoundedJsonObject(request, 256 * 1024); }
    catch { return Response.json({ error: "invalid-request" }, { status: 400, headers }); }
    database.close(); database = undefined;
    const response = await services.handler(origin).fetch(request, { authInfo, parsedBody });
    const nextHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(headers)) nextHeaders.set(key, value);
    return new Response(response.body, { status: response.status, headers: nextHeaders });
  } catch (error) {
    if (error instanceof McpCommandStoreError && error.code === "rate-limit-exceeded") return Response.json({ error: "rate-limit-exceeded" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
    return Response.json({ error: "temporarily-unavailable" }, { status: 503, headers });
  } finally { database?.close(); }
}
