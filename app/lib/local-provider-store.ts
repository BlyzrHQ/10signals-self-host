import Database from "better-sqlite3";
import { createCipheriv, createDecipheriv, createHash, createPublicKey, generateKeyPairSync, privateDecrypt, publicEncrypt, randomBytes, randomUUID, constants } from "node:crypto";
import { closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localExecutionEnabled } from "./self-host-config.ts";

export type ProviderOwner = { workspaceId: string; userId: string };
export type ProviderSummary = { configured: boolean; lastFour: string; version: string | null; updatedAt: string | null };
type StoredKey = { workspace_id: string; user_id: string; version: string; envelope: string; last_four: string; updated_at: string };
type Vault = { key_id: string; public_key: string };
export class ProviderSettingsError extends Error {
  readonly code: "invalid-key" | "conflict" | "rate-limited" | "unavailable" | "key-missing";
  constructor(code: ProviderSettingsError["code"]) { super(code); this.code = code; }
}
export function accountProviderEnabled(env: Record<string, string | undefined> = process.env) {
  return localExecutionEnabled(env) && env.MARKET_SIGNAL_ACCOUNT_PROVIDER === "true";
}
export function providerDatabasePath(env: Record<string, string | undefined> = process.env) {
  if (!env.MARKET_SIGNAL_SQLITE_PATH?.trim()) throw new ProviderSettingsError("unavailable");
  return `${env.MARKET_SIGNAL_SQLITE_PATH.trim()}.providers.sqlite`;
}
export function validProviderKey(value: unknown): value is string {
  return typeof value === "string" && /^sk-[A-Za-z0-9_-]{17,1021}$/.test(value);
}
const aad = (owner: ProviderOwner, version: string) => Buffer.from(JSON.stringify(["10signals-openai-v1", owner.workspaceId, owner.userId, version]));

/** Only encrypted provider material is shared with the web service. */
export class LocalProviderStore {
  readonly database: Database.Database;
  constructor(path: string) {
    this.database = new Database(path);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("busy_timeout = 10000");
    this.database.exec(`CREATE TABLE IF NOT EXISTS local_provider_vault (id INTEGER PRIMARY KEY CHECK(id=1), key_id TEXT NOT NULL, public_key TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS local_provider_keys (workspace_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, version TEXT NOT NULL, envelope TEXT NOT NULL, last_four TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS local_provider_checks (workspace_id TEXT PRIMARY KEY, window_at INTEGER NOT NULL, count INTEGER NOT NULL);`);
  }
  close() { this.database.close(); }
  vault() { return this.database.prepare("SELECT key_id,public_key FROM local_provider_vault WHERE id=1").get() as Vault | undefined; }
  private row(workspaceId: string) { return this.database.prepare("SELECT * FROM local_provider_keys WHERE workspace_id=?").get(workspaceId) as StoredKey | undefined; }
  summary(owner: ProviderOwner): ProviderSummary {
    const row = this.row(owner.workspaceId);
    if (row && row.user_id !== owner.userId) throw new ProviderSettingsError("unavailable");
    return { configured: Boolean(row?.envelope), lastFour: row?.last_four || "", version: row?.version || null, updatedAt: row?.updated_at || null };
  }
  assertVersion(owner: ProviderOwner, expected: unknown) {
    if (expected !== null && (typeof expected !== "string" || !/^[a-f0-9-]{36}$/.test(expected))) throw new ProviderSettingsError("conflict");
    if (this.summary(owner).version !== expected) throw new ProviderSettingsError("conflict");
  }
  claimCheck(owner: ProviderOwner, now = Date.now()) {
    this.database.transaction(() => {
      const row = this.database.prepare("SELECT window_at,count FROM local_provider_checks WHERE workspace_id=?").get(owner.workspaceId) as { window_at: number; count: number } | undefined;
      const fresh = !row || now - row.window_at >= 60_000 || now < row.window_at;
      if (!fresh && row.count >= 5) throw new ProviderSettingsError("rate-limited");
      this.database.prepare("INSERT INTO local_provider_checks VALUES(?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET window_at=excluded.window_at,count=excluded.count").run(owner.workspaceId, fresh ? now : row.window_at, fresh ? 1 : row.count + 1);
    }).immediate();
  }
  save(owner: ProviderOwner, apiKey: string, expected: string | null) {
    if (!validProviderKey(apiKey)) throw new ProviderSettingsError("invalid-key");
    const vault = this.vault();
    if (!vault) throw new ProviderSettingsError("unavailable");
    const version = randomUUID(), key = randomBytes(32), iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(aad(owner, version));
    const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
    const envelope = JSON.stringify({ v: 1, keyId: vault.key_id,
      sealed: publicEncrypt({ key: vault.public_key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, key).toString("base64"),
      iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") });
    key.fill(0);
    this.database.transaction(() => {
      this.assertVersion(owner, expected);
      this.database.prepare("INSERT INTO local_provider_keys VALUES(?,?,?,?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET user_id=excluded.user_id,version=excluded.version,envelope=excluded.envelope,last_four=excluded.last_four,updated_at=excluded.updated_at")
        .run(owner.workspaceId, owner.userId, version, envelope, apiKey.slice(-4), new Date().toISOString());
    }).immediate();
    return this.summary(owner);
  }
  remove(owner: ProviderOwner, expected: string | null) {
    this.database.transaction(() => {
      this.assertVersion(owner, expected);
      this.database.prepare("INSERT INTO local_provider_keys VALUES(?,?,?,'','',?) ON CONFLICT(workspace_id) DO UPDATE SET version=excluded.version,envelope='',last_four='',updated_at=excluded.updated_at")
        .run(owner.workspaceId, owner.userId, randomUUID(), new Date().toISOString());
    }).immediate();
    return this.summary(owner);
  }
  decryptForWorkspace(workspaceId: string, privateKey: string) {
    const row = this.row(workspaceId), vault = this.vault();
    if (!row?.envelope || !vault) throw new ProviderSettingsError("key-missing");
    try {
      const envelope = JSON.parse(row.envelope);
      if (envelope.v !== 1 || envelope.keyId !== vault.key_id || row.envelope.length > 8192) throw Error();
      const key = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(envelope.sealed, "base64"));
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
        decipher.setAAD(aad({ workspaceId, userId: row.user_id }, row.version));
        decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
        const apiKey = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8");
        if (!validProviderKey(apiKey)) throw Error();
        return { apiKey, userId: row.user_id, version: row.version };
      } finally { key.fill(0); }
    } catch { throw new ProviderSettingsError("unavailable"); }
  }
}

/** Called only by the worker; this directory is never mounted in the web container. */
export function initializeWorkerProviderVault(store: LocalProviderStore, directory: string) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) throw new ProviderSettingsError("unavailable");
  const filename = join(directory, "private.pem");
  if (!existsSync(filename)) {
    if (store.vault()) throw new ProviderSettingsError("unavailable"); // Never replace a lost decryption key.
    const generated = generateKeyPairSync("rsa", { modulusLength: 3072, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
    const temporary = join(directory, `private-${randomUUID()}.tmp`);
    const file = openSync(temporary, "wx", 0o600);
    try { writeFileSync(file, generated.privateKey); fsyncSync(file); } finally { closeSync(file); }
    try { linkSync(temporary, filename); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    finally { unlinkSync(temporary); }
    if (process.platform !== "win32") {
      const folder = openSync(directory, "r");
      try { fsyncSync(folder); } finally { closeSync(folder); }
    }
  }
  if (!lstatSync(filename).isFile() || lstatSync(filename).isSymbolicLink() || lstatSync(filename).size > 8192) throw new ProviderSettingsError("unavailable");
  if (process.platform !== "win32" && (lstatSync(filename).mode & 0o077)) throw new ProviderSettingsError("unavailable");
  const privateKey = readFileSync(filename, "utf8");
  const publicKey = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
  const keyId = createHash("sha256").update(publicKey).digest("hex");
  store.database.prepare("INSERT OR IGNORE INTO local_provider_vault VALUES(1,?,?)").run(keyId, publicKey);
  if (store.vault()?.key_id !== keyId) throw new ProviderSettingsError("unavailable");
  return privateKey;
}
