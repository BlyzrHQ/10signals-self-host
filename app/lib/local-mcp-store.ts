import Database from "better-sqlite3";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { localHttpOrigin } from "./local-http.ts";
import { accountProviderEnabled } from "./local-provider-store.ts";
import { canonicalNodeSqlitePath } from "./node-sqlite-database.ts";
import { consumeMcpRateLimit, recordMcpCommandAudit } from "./mcp-command-store.ts";

export type LocalMcpOwner = { workspaceId: string; userId: string };
export type LocalMcpScope = "reports:read" | "reports:create";
const TOKEN = /^tsm_local_([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{43})$/;
const hash = (token: string) => createHash("sha256").update(token).digest();

export function localMcpOrigin(environment: Record<string, string | undefined> = process.env) {
  return environment.MARKET_SIGNAL_LOCAL_MCP === "true" && accountProviderEnabled(environment)
    && environment.MARKET_SIGNAL_HOSTED_BILLING !== "true" ? localHttpOrigin(environment) : null;
}
export class LocalMcpError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = "LocalMcpError"; }
}
export async function openLocalMcpDatabase(environment: Record<string, string | undefined> = process.env) {
  const database = new Database(await canonicalNodeSqlitePath(environment.MARKET_SIGNAL_SQLITE_PATH || ""));
  database.pragma("busy_timeout = 10000"); database.pragma("foreign_keys = ON"); database.pragma("journal_mode = WAL");
  ensureLocalMcpSchema(database);
  return database;
}
export function ensureLocalMcpSchema(database: Database.Database) {
  database.exec(`CREATE TABLE IF NOT EXISTS local_mcp_connections (
    id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
    origin TEXT NOT NULL, name TEXT NOT NULL, token_hash BLOB NOT NULL,
    scopes TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
    last_used_at TEXT, revoked_at TEXT
  ); CREATE INDEX IF NOT EXISTS local_mcp_owner ON local_mcp_connections(workspace_id, user_id);`);
}
function ownerExists(database: Database.Database, owner: LocalMcpOwner) {
  return Boolean(database.prepare(`SELECT 1 FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id
    JOIN "user" u ON u.id=m.user_id WHERE w.id=? AND w.personal_owner_user_id=? AND m.user_id=? AND m.role='owner'`)
    .get(owner.workspaceId, owner.userId, owner.userId));
}
function assertOwner(database: Database.Database, owner: LocalMcpOwner) {
  if (!ownerExists(database, owner)) throw new LocalMcpError("invalid-account", "The local account is unavailable.");
}
type Row = { id: string; workspace_id: string; user_id: string; origin: string; name: string; token_hash: Buffer;
  scopes: string; created_at: string; expires_at: string; last_used_at: string | null; revoked_at: string | null };
function metadata(row: Row, now: Date) {
  return { id: row.id, name: row.name, scopes: row.scopes.split(" "), createdAt: row.created_at,
    expiresAt: row.expires_at, lastUsedAt: row.last_used_at, revokedAt: row.revoked_at,
    status: row.revoked_at ? "revoked" : row.expires_at <= now.toISOString() ? "expired" : "active" };
}
export function listLocalMcpConnections(database: Database.Database, owner: LocalMcpOwner, origin: string, now = new Date()) {
  assertOwner(database, owner);
  return (database.prepare(`SELECT * FROM local_mcp_connections WHERE workspace_id=? AND user_id=? AND origin=?
    ORDER BY created_at DESC, id DESC LIMIT 100`).all(owner.workspaceId, owner.userId, origin) as Row[]).map(row => metadata(row, now));
}
export function createLocalMcpConnection(database: Database.Database, owner: LocalMcpOwner, origin: string,
  input: { name?: unknown; access?: unknown; expiresInDays?: unknown }, now = new Date()) {
  assertOwner(database, owner);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 60 || /[\x00-\x1f\x7f]/.test(name)) throw new LocalMcpError("invalid-name", "Enter a connection name (1–60 characters).");
  const access = input.access ?? "read";
  if (access !== "read" && access !== "full") throw new LocalMcpError("invalid-access", "Choose read-only or create-and-read access.");
  const days = input.expiresInDays ?? 30;
  if (![7, 30, 90].includes(days as number)) throw new LocalMcpError("invalid-expiry", "Choose 7, 30 or 90 days.");
  const id = randomBytes(12).toString("base64url"), token = `tsm_local_${id}.${randomBytes(32).toString("base64url")}`;
  const scopes = access === "full" ? "reports:read reports:create" : "reports:read";
  const row: Row = { id, workspace_id: owner.workspaceId, user_id: owner.userId, origin, name, token_hash: hash(token), scopes,
    created_at: now.toISOString(), expires_at: new Date(now.getTime() + Number(days) * 86400000).toISOString(), last_used_at: null, revoked_at: null };
  database.transaction(() => {
    consumeMcpRateLimit(database, { ...owner, clientId: "local-mcp-settings" }, "connection-create", 5, 60, now);
    const active = database.prepare(`SELECT count(*) AS n FROM local_mcp_connections WHERE workspace_id=? AND user_id=? AND revoked_at IS NULL AND expires_at>?`)
      .get(owner.workspaceId, owner.userId, now.toISOString()) as { n: number };
    if (active.n >= 10) throw new LocalMcpError("connection-limit", "Revoke an unused connection before creating another (maximum 10 active).");
    database.prepare(`INSERT INTO local_mcp_connections VALUES (@id,@workspace_id,@user_id,@origin,@name,@token_hash,@scopes,@created_at,@expires_at,@last_used_at,@revoked_at)`).run(row);
    recordMcpCommandAudit(database, { ...owner, clientId: `local-mcp:${id}` }, { toolName: "connection_create", eventType: "local-connection.created", detail: { scopes: scopes.split(" "), expiresAt: row.expires_at } }, now);
  }).immediate();
  return { token, connection: metadata(row, now) };
}
export function revokeLocalMcpConnection(database: Database.Database, owner: LocalMcpOwner, origin: string, id: unknown, now = new Date()) {
  assertOwner(database, owner);
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{16}$/.test(id)) throw new LocalMcpError("not-found", "Connection not found.");
  const result = database.prepare(`UPDATE local_mcp_connections SET revoked_at=COALESCE(revoked_at,?) WHERE id=? AND workspace_id=? AND user_id=? AND origin=?`)
    .run(now.toISOString(), id, owner.workspaceId, owner.userId, origin);
  if (!result.changes) throw new LocalMcpError("not-found", "Connection not found.");
  recordMcpCommandAudit(database, { ...owner, clientId: `local-mcp:${id}` }, { toolName: "connection_revoke", eventType: "local-connection.revoked" }, now);
}
export function authorizeLocalMcpToken(database: Database.Database, token: string, origin: string, now = new Date()): AuthInfo | null {
  const match = TOKEN.exec(token);
  if (!match) return null;
  const row = database.prepare("SELECT * FROM local_mcp_connections WHERE id=?").get(match[1]) as Row | undefined;
  if (!row || row.origin !== origin || row.revoked_at || row.expires_at <= now.toISOString()
    || !Buffer.isBuffer(row.token_hash) || row.token_hash.length !== 32 || !timingSafeEqual(row.token_hash, hash(token))) return null;
  const owner = { workspaceId: row.workspace_id, userId: row.user_id };
  if (!ownerExists(database, owner)) return null;
  const scopes = row.scopes.split(" ");
  if (!scopes.includes("reports:read") || scopes.some(scope => !["reports:read", "reports:create"].includes(scope))) return null;
  const clientId = `local-mcp:${row.id}`;
  consumeMcpRateLimit(database, { ...owner, clientId }, "requests", 120, 60, now);
  if (!row.last_used_at || Date.parse(row.last_used_at) < now.getTime() - 60000) database.prepare("UPDATE local_mcp_connections SET last_used_at=? WHERE id=?").run(now.toISOString(), row.id);
  return { token, clientId, scopes, expiresAt: Math.floor(Date.parse(row.expires_at) / 1000), resource: new URL(`${origin}/mcp`), extra: owner };
}
