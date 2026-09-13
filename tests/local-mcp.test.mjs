import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { ensureAccountSchema, ensurePersonalWorkspace } from "../app/lib/account-auth.ts";
import { localMcpOrigin, ensureLocalMcpSchema, createLocalMcpConnection, listLocalMcpConnections, revokeLocalMcpConnection, authorizeLocalMcpToken } from "../app/lib/local-mcp-store.ts";
import { hostedMcpEnabled } from "../app/lib/mcp-oauth-config.ts";
import { localMcpRoute } from "../app/lib/local-mcp-route.ts";
import { localMcpConnectionsRoute } from "../app/api/account/mcp-connections/route.ts";
import { createLocalMcpHandler } from "../app/lib/local-mcp-server.ts";
import { previewLocalReport, confirmLocalReport } from "../app/lib/local-mcp-service.ts";
import { ReportQueryError } from "../app/lib/report-query-service.ts";
import { createReportCommand } from "../app/lib/report-command-service.ts";
import { NodeSqliteDatabase } from "../app/lib/node-sqlite-database.ts";
import { createReportRunResult, markReportDispatched, getStoredReport } from "../app/lib/report-store.ts";
import { LocalReportQueue } from "../src/local/report-queue.ts";
import { enqueueLocalReport } from "../app/lib/local-report-dispatch.ts";

const origin = "http://localhost:8787", publicId = "a".repeat(32);
const env = { MARKET_SIGNAL_MODE: "self-hosted", MARKET_SIGNAL_EXECUTION_BACKEND: "local", MARKET_SIGNAL_ACCOUNT_PROVIDER: "true", MARKET_SIGNAL_LOCAL_HTTP: "true", MARKET_SIGNAL_LOCAL_MCP: "true", BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "x".repeat(64) };
const input = { primaryDomain: "https://nike.com/", locale: "en", comparisons: 20, includeAnalysis: false, closePricePercent: 30 };
function applyEnv(t, values) { const old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]])); Object.assign(process.env, values); t.after(() => { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }); }
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "signals-mcp-")), path = join(root, "data.sqlite");
  const db = new Database(path); db.pragma("journal_mode=WAL"); ensureAccountSchema(db); ensureLocalMcpSchema(db);
  const owners = ["alice", "bob"].map(id => {
    db.prepare('INSERT INTO "user"(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,0,?,?)').run(id, id, `${id}@example.invalid`, new Date().toISOString(), new Date().toISOString());
    return { userId: id, workspaceId: ensurePersonalWorkspace(db, { id, name: id }) };
  });
  t.after(async () => { db.close(); await rm(root, { recursive: true, force: true }); });
  let now = new Date();
  const calls = [], services = { openDatabase: async () => new Database(path), now: () => now, setupMessage: async () => null,
    status: async () => ({ providerConfigured: true, worker: "ready" }),
    createReport: async args => { calls.push(args); return { ok: true, replayed: false, report: { publicId, primaryDomain: args.primaryDomain, productLimit: args.comparisonTarget, status: "queued" } }; } };
  const reads = {
    listReports: async workspace => ({ items: workspace === owners[0].workspaceId ? [{ publicId, primaryDomain: "nike.com", status: "complete" }] : [], nextCursor: null }),
    getReport: async (workspace, id) => { if (workspace !== owners[0].workspaceId || id !== publicId) throw new ReportQueryError(); return { run: { publicId, status: "complete" }, document: { fixture: true } }; },
    listReportMatches: async (workspace, id) => { if (workspace !== owners[0].workspaceId || id !== publicId) throw new ReportQueryError(); return { items: [{ fixture: true, primary: { url: "https://primary.example/product" }, rival: { url: "https://rival.example/product", price: 20 }, claimType: "test-fixture" }], nextCursor: null }; },
  };
  const handler = createLocalMcpHandler(origin, reads, services); t.after(() => handler.close());
  const route = { origin: () => origin, openDatabase: async () => new Database(path), handler: () => handler };
  return { root, path, db, owners, calls, services, route, setNow: date => { now = date; }, now: () => now };
}
function tokenFor(f, owner = f.owners[0], access = "read") { return createLocalMcpConnection(f.db, owner, origin, { name: "Test client", access }, f.now()); }
function rpc(token, method = "tools/list", params = {}, headers = {}) {
  return new Request(`${origin}/mcp`, { method: "POST", headers: { host: "localhost:8787", authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
}
async function connect(t, f, token, mode) {
  const client = new Client({ name: "local-mcp-acceptance", version: "1" }, mode ? { versionNegotiation: { mode } } : {});
  const transport = new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), { authProvider: { token: async () => token },
    fetch: async (url, init) => { const req = new Request(url, init); req.headers.set("host", new URL(url).host); return localMcpRoute(req, f.route); } });
  t.after(() => client.close()); await client.connect(transport); return client;
}

test("local MCP opt-in gates are mutually exclusive with hosted auth", () => {
  assert.equal(localMcpOrigin(env), origin); assert.equal(hostedMcpEnabled(env, origin), false);
  for (const change of [{ MARKET_SIGNAL_MODE: "hosted" }, { MARKET_SIGNAL_EXECUTION_BACKEND: "trigger" }, { MARKET_SIGNAL_ACCOUNT_PROVIDER: "false" }, { MARKET_SIGNAL_LOCAL_HTTP: "false" }, { MARKET_SIGNAL_LOCAL_MCP: "false" }, { MARKET_SIGNAL_HOSTED_BILLING: "true" }, { BETTER_AUTH_URL: "https://10signals.xyz" }, { BETTER_AUTH_URL: "http://127.0.0.1:8787" }]) assert.equal(localMcpOrigin({ ...env, ...change }), null);
});
test("tokens are hashed, read-only by default, origin-bound, expiring and owner-revocable", async t => {
  const f = await fixture(t), issued = tokenFor(f);
  assert.match(issued.token, /^tsm_local_/); assert.deepEqual(issued.connection.scopes, ["reports:read"]);
  assert.equal(authorizeLocalMcpToken(f.db, issued.token, origin).extra.workspaceId, f.owners[0].workspaceId);
  assert.equal(authorizeLocalMcpToken(f.db, issued.token, "http://localhost:9999"), null);
  assert.equal(authorizeLocalMcpToken(f.db, `${issued.token.slice(0, -1)}!`, origin), null);
  assert.equal(authorizeLocalMcpToken(f.db, issued.token, origin, new Date(Date.now() + 31 * 86400000)), null);
  assert.equal(authorizeLocalMcpToken(f.db, "msk_live_not-a-local-key", origin), null);
  assert.equal(listLocalMcpConnections(f.db, f.owners[1], origin).length, 0);
  assert.throws(() => revokeLocalMcpConnection(f.db, f.owners[1], origin, issued.connection.id), /not found/);
  assert.ok(!JSON.stringify(listLocalMcpConnections(f.db, f.owners[0], origin)).includes(issued.token));
  f.db.pragma("wal_checkpoint(TRUNCATE)"); assert.ok(!(await readFile(f.path)).includes(Buffer.from(issued.token)));
  revokeLocalMcpConnection(f.db, f.owners[0], origin, issued.connection.id);
  assert.equal(authorizeLocalMcpToken(f.db, issued.token, origin), null);
  assert.equal(listLocalMcpConnections(f.db, f.owners[0], origin)[0].status, "revoked");
});
test("token verification rejects valid-id wrong-secret and removed membership", async t => {
  const f = await fixture(t), issued = tokenFor(f);
  assert.equal(authorizeLocalMcpToken(f.db, issued.token.split(".")[0] + "." + "z".repeat(43), origin), null);
  f.db.prepare("DELETE FROM workspace_members WHERE user_id=?").run(f.owners[0].userId);
  assert.equal(authorizeLocalMcpToken(f.db, issued.token, origin), null);
});
test("connection settings are bounded, explicit and capped", async t => {
  const f = await fixture(t);
  for (const bad of [{ name: "" }, { name: "x", access: "price_watch:write" }, { name: "x", expiresInDays: 999 }, { name: "x\n" + "y" }]) assert.throws(() => createLocalMcpConnection(f.db, f.owners[0], origin, bad));
  for (let n = 0; n < 10; n++) { f.setNow(new Date(Date.now() + n * 61000)); tokenFor(f); }
  f.setNow(new Date(Date.now() + 11 * 61000)); assert.throws(() => tokenFor(f), /maximum 10/);
});
test("management API requires same-origin session; cannot supply workspace or scopes", async t => {
  applyEnv(t, env); const f = await fixture(t), owner = f.owners[0];
  const deps = { origin: () => origin, openDatabase: f.services.openDatabase, authorize: async () => ({ workspaceId: owner.workspaceId, user: { id: owner.userId } }) };
  const request = (body, headers = {}) => new Request(`${origin}/api/account/mcp-connections`, { method: "POST", headers: { host: "localhost:8787", origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  assert.equal((await localMcpConnectionsRoute(request({ name: "Agent" }), { ...deps, authorize: async () => null })).status, 401);
  assert.equal((await localMcpConnectionsRoute(request({ name: "Agent" }, { origin: "http://evil.invalid" }), deps)).status, 403);
  assert.equal((await localMcpConnectionsRoute(request({ name: "Agent", workspaceId: "other" }), deps)).status, 400);
  assert.equal((await localMcpConnectionsRoute(request({ name: "Agent", scopes: ["price_watch:write"] }), deps)).status, 400);
  const created = await localMcpConnectionsRoute(request({ name: "Agent" }), deps); assert.equal(created.status, 201); assert.match(created.headers.get("cache-control"), /no-store/);
  const payload = await created.json(); assert.ok(payload.token);
  const listed = await localMcpConnectionsRoute(new Request(`${origin}/api/account/mcp-connections`, { headers: { host: "localhost:8787" } }), deps);
  assert.ok(!(await listed.text()).includes(payload.token));
});
test("MCP denies cookie-only, foreign Origin/Host, malformed auth and oversized bodies", async t => {
  const f = await fixture(t), issued = tokenFor(f);
  for (const auth of ["", "Bearer garbage", "Basic abc"]) assert.equal((await localMcpRoute(rpc("", "tools/list", {}, { authorization: auth, cookie: "session=not-authority" }), f.route)).status, 401);
  for (const headers of [{ origin: "null" }, { origin: "http://evil.invalid" }, { host: "127.0.0.1:8787", "x-forwarded-host": "localhost:8787" }]) assert.equal((await localMcpRoute(rpc(issued.token, "tools/list", {}, headers), f.route)).status, 403);
  assert.equal((await localMcpRoute(rpc(issued.token, "tools/list", {}, { "content-type": "text/plain" }), f.route)).status, 415);
  assert.equal((await localMcpRoute(rpc(issued.token, "tools/list", { extra: "x".repeat(270000) }), f.route)).status, 400);
  assert.equal((await localMcpRoute(rpc(issued.token), { ...f.route, origin: () => null })).status, 404);
});
for (const mode of [undefined, { pin: "2026-07-28" }]) test(`real MCP SDK ${mode ? "modern" : "2025 legacy"} connects, reads structured results, enforces scopes and revocation`, async t => {
  const f = await fixture(t), issued = tokenFor(f), client = await connect(t, f, issued.token, mode);
  assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ["account_status", "reports_list", "report_get", "report_matches_list"]);
  const status = (await client.callTool({ name: "account_status", arguments: {} })).structuredContent;
  assert.equal(status.execution, "local"); assert.equal(status.endpoint, `${origin}/mcp`); assert.equal("subscription" in status, false);
  const reports = (await client.callTool({ name: "reports_list", arguments: {} })).structuredContent;
  assert.equal(reports.reports[0].privateUrl, `${origin}/reports/${publicId}`);
  const report = (await client.callTool({ name: "report_get", arguments: { publicReportId: publicId } })).structuredContent;
  assert.equal(report.pollAfterSeconds, null); assert.equal(report.report.document.fixture, true);
  const matches = (await client.callTool({ name: "report_matches_list", arguments: { publicReportId: publicId } })).structuredContent;
  assert.equal(matches.items[0].claimType, "test-fixture"); assert.ok(matches.items[0].primary.url); assert.ok(matches.items[0].rival.url);
  await assert.rejects(client.callTool({ name: "report_create_confirm", arguments: { confirmationToken: "x".repeat(43) } }));
  revokeLocalMcpConnection(f.db, f.owners[0], origin, issued.connection.id);
  await assert.rejects(client.listTools()); assert.equal(f.calls.length, 0);
});
test("another account has separate history and cannot read report or comparisons", async t => {
  const f = await fixture(t), client = await connect(t, f, tokenFor(f, f.owners[1]).token);
  assert.deepEqual((await client.callTool({ name: "reports_list", arguments: {} })).structuredContent.reports, []);
  for (const name of ["report_get", "report_matches_list"]) { const result = await client.callTool({ name, arguments: { publicReportId: publicId } }); assert.equal(result.isError, true); assert.equal(result.structuredContent.error.code, "not-found"); }
});
test("full connection previews without research then confirms once with exact actor/options", async t => {
  const f = await fixture(t), issued = tokenFor(f, f.owners[0], "full"), client = await connect(t, f, issued.token);
  assert.equal((await client.listTools()).tools.length, 6);
  const preview = (await client.callTool({ name: "report_create_preview", arguments: input })).structuredContent;
  assert.equal(f.calls.length, 0); assert.equal(preview.impact.primaryDomain, "nike.com"); assert.equal(preview.impact.researchStarted, false);
  const confirmed = (await client.callTool({ name: "report_create_confirm", arguments: { confirmationToken: preview.confirmationToken } })).structuredContent;
  const replayed = (await client.callTool({ name: "report_create_confirm", arguments: { confirmationToken: preview.confirmationToken } })).structuredContent;
  assert.equal(confirmed.report.publicReportId, publicId); assert.equal(replayed.report.publicReportId, publicId); assert.equal(replayed.replayed, true); assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0].actor, f.owners[0]); assert.equal(f.calls[0].comparisonTarget, 20); assert.equal(f.calls[0].closePricePercent, 30); assert.equal(f.calls[0].includeAnalysis, false);
  const client2 = await connect(t, f, tokenFor(f, f.owners[0], "full").token);
  assert.equal((await client2.callTool({ name: "report_create_confirm", arguments: { confirmationToken: preview.confirmationToken } })).isError, true);
});
test("missing provider stops before preview/creation; removed key is rechecked by shared command", async t => {
  const f = await fixture(t), principal = { ...f.owners[0], clientId: "local-test" };
  await assert.rejects(previewLocalReport(principal, input, { ...f.services, setupMessage: () => "Add your OpenAI key. No report was created." }), /Add your OpenAI/);
  assert.equal(f.calls.length, 0);
  const preview = await previewLocalReport(principal, input, f.services);
  let touched = false;
  const createReport = args => createReportCommand(args, { preflight: () => "Key removed. No report was created.", create: () => { touched = true; }, dispatch: () => { touched = true; } });
  const failed = await confirmLocalReport(principal, preview.confirmationToken, origin, { ...f.services, createReport });
  assert.equal(failed.ok, false); assert.equal(failed.error.code, "research-setup-required"); assert.equal(touched, false);
});
test("expired preview cannot create; uncertain confirmation reuses its command identity", async t => {
  const f = await fixture(t), principal = { ...f.owners[0], clientId: "local-test" };
  const expired = await previewLocalReport(principal, input, f.services); f.setNow(new Date(Date.now() + 6 * 60000));
  assert.equal((await confirmLocalReport(principal, expired.confirmationToken, origin, f.services)).error.code, "confirmation-expired"); assert.equal(f.calls.length, 0);
  const preview = await previewLocalReport(principal, input, f.services), ids = [];
  const flaky = { ...f.services, createReport: async args => { ids.push(args.commandId); throw Error("Synthetic uncertain dispatch"); } };
  await assert.rejects(confirmLocalReport(principal, preview.confirmationToken, origin, flaky));
  assert.equal((await confirmLocalReport(principal, preview.confirmationToken, origin, f.services)).status, "in_progress");
  f.setNow(new Date(f.now().getTime() + 61000)); await confirmLocalReport(principal, preview.confirmationToken, origin, f.services);
  assert.equal(f.calls[0].commandId, ids[0]);
});

test("confirmed MCP input reaches real report storage and local queue exactly once (research not executed)", async t => {
  const f = await fixture(t); applyEnv(t, { ...env, MARKET_SIGNAL_SQLITE_PATH: f.path, MARKET_SIGNAL_HOSTED_BILLING: "false" });
  const storage = await NodeSqliteDatabase.open(f.path), queue = new LocalReportQueue(`${f.path}.queue.sqlite`);
  try {
    queue.noteWorkerReady();
    const services = { ...f.services, createReport: args => createReportCommand(args, {
      preflight: () => null, // Synthetic ready-provider boundary; no provider API or worker execution.
      create: input => createReportRunResult(input, new Date(), storage), dispatch: enqueueLocalReport,
      markDispatched: (id, run) => markReportDispatched(id, run, new Date(), storage), markDispatchFailed: async () => { throw Error("Unexpected failure"); },
    }) };
    const principal = { ...f.owners[0], clientId: "integration-client" }, preview = await previewLocalReport(principal, input, services);
    const first = await confirmLocalReport(principal, preview.confirmationToken, origin, services);
    assert.equal(first.ok, true);
    const second = await confirmLocalReport(principal, preview.confirmationToken, origin, services);
    assert.equal(second.report.publicReportId, first.report.publicReportId); assert.equal(second.replayed, true);
    const saved = await getStoredReport(first.report.publicReportId, new Date(), storage);
    assert.equal(saved.run.workspaceId, principal.workspaceId); assert.equal(saved.run.productLimit, 20);
    const jobs = queue.database.prepare("SELECT payload FROM local_report_jobs").all(); assert.equal(jobs.length, 1);
    const payload = JSON.parse(jobs[0].payload); assert.equal(payload.primaryDomain, "nike.com"); assert.equal(payload.productLimit, 20);
    assert.equal(payload.researchOptions.closePricePercent, 30); assert.equal(payload.researchOptions.includeAnalysis, false);
    assert.ok(!jobs[0].payload.includes("apiKey"));
  } finally { storage.close(); queue.close(); }
});
