import Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import { parseWebDirectReportPayload, type WebDirectReportPayload } from "../shared/web-direct-report-contract.ts";
import { hash, type StatePacket } from "../trigger-direct/workflow-state.ts";

export type LocalJob = { id: string; payload: WebDirectReportPayload; token: string };
const LEASE_MS = 60_000;

/** Single active report per installation. Expired work stops; it is never rebilled automatically. */
export class LocalReportQueue {
  readonly database: Database.Database;
  constructor(path: string) {
    this.database = new Database(path);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("busy_timeout = 10000");
    this.database.exec(`CREATE TABLE IF NOT EXISTS local_report_jobs (
      id TEXT PRIMARY KEY, intent TEXT NOT NULL UNIQUE, payload TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('queued','running','complete','failed','interrupted')),
      token TEXT NOT NULL DEFAULT '', lease_until INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      packet TEXT, revision INTEGER NOT NULL DEFAULT -1, error_code TEXT NOT NULL DEFAULT ''
    ); CREATE UNIQUE INDEX IF NOT EXISTS local_report_single_active ON local_report_jobs(status) WHERE status='running';
    CREATE TABLE IF NOT EXISTS local_worker_presence (id INTEGER PRIMARY KEY CHECK(id=1), seen_at INTEGER NOT NULL);`);
    const columns = new Set((this.database.prepare("PRAGMA table_info(local_report_jobs)").all() as Array<{name:string}>).map(row=>row.name));
    if (!columns.has("confirmed")) this.database.exec("ALTER TABLE local_report_jobs ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("terminal_notified")) this.database.exec("ALTER TABLE local_report_jobs ADD COLUMN terminal_notified INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("notify_after")) this.database.exec("ALTER TABLE local_report_jobs ADD COLUMN notify_after INTEGER NOT NULL DEFAULT 0");
    const presenceColumns = this.database.prepare("PRAGMA table_info(local_worker_presence)").all() as Array<{ name: string }>;
    if (!presenceColumns.some(column => column.name === "research_enabled")) this.database.exec("ALTER TABLE local_worker_presence ADD COLUMN research_enabled INTEGER NOT NULL DEFAULT 1");
  }
  close() { this.database.close(); }
  private storedPayload(row: {id:string;payload:string}) {
    try { return parseWebDirectReportPayload(JSON.parse(row.payload)); }
    catch {
      // Keep the corrupt payload for operator inspection; never execute it or
      // guess which report should be changed from invalid identity fields.
      this.database.prepare("UPDATE local_report_jobs SET status='failed',error_code='invalid-saved-payload',terminal_notified=1 WHERE id=?").run(row.id);
      return null;
    }
  }
  awaitingConfirmation() {
    return (this.database.prepare("SELECT id,payload FROM local_report_jobs WHERE status='queued' AND confirmed=0 ORDER BY created_at LIMIT 100").all() as Array<{id:string;payload:string}>).flatMap(row=>{const payload=this.storedPayload(row);return payload?[{id:row.id,payload}]:[];});
  }
  confirm(id: string) { this.database.prepare("UPDATE local_report_jobs SET confirmed=1 WHERE id=? AND status='queued'").run(id); }
  unnotifiedTerminal() {
    return (this.database.prepare("SELECT id,payload,status,error_code FROM local_report_jobs WHERE status IN ('failed','interrupted') AND terminal_notified=0 AND notify_after<=? ORDER BY updated_at LIMIT 10").all(Date.now()) as Array<{id:string;payload:string;status:string;error_code:string}>).flatMap(row=>{const payload=this.storedPayload(row);return payload?[{...row,payload}]:[];});
  }
  deferNotification(id: string) { this.database.prepare("UPDATE local_report_jobs SET notify_after=? WHERE id=?").run(Date.now()+60_000,id); }
  expireUnconfirmed(now=Date.now()) { this.database.prepare("UPDATE local_report_jobs SET status='failed',error_code='dispatch-unconfirmed',updated_at=? WHERE status='queued' AND confirmed=0 AND created_at<?").run(now,now-300_000); }
  markNotified(id: string) { this.database.prepare("UPDATE local_report_jobs SET terminal_notified=1 WHERE id=? AND status IN ('failed','interrupted')").run(id); }
  failQueuedWithoutProvider() {
    this.database.prepare("UPDATE local_report_jobs SET status='failed',error_code='provider-not-configured',updated_at=? WHERE status='queued'").run(Date.now());
  }
  noteWorkerReady(now = Date.now(), researchEnabled = true) {
    this.database.prepare("INSERT INTO local_worker_presence(id,seen_at,research_enabled) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET seen_at=excluded.seen_at,research_enabled=excluded.research_enabled").run(now, Number(researchEnabled));
  }
  workerStatus(now = Date.now()): "ready" | "disabled" | "unavailable" {
    const row = this.database.prepare("SELECT seen_at,research_enabled FROM local_worker_presence WHERE id=1").get() as { seen_at: number; research_enabled: number } | undefined;
    if (!row || row.seen_at > now || row.seen_at <= now - 30_000) return "unavailable";
    return row.research_enabled ? "ready" : "disabled";
  }
  workerReady(now = Date.now()) {
    return this.workerStatus(now) === "ready";
  }
  enqueue(input: unknown, now = Date.now()) {
    const payload = parseWebDirectReportPayload(input);
    const intent = `${payload.publicId}:${payload.reportAttempt}`;
    return this.database.transaction(() => {
      const prior = this.database.prepare("SELECT id,payload FROM local_report_jobs WHERE intent=?").get(intent) as { id: string; payload: string } | undefined;
      if (prior) {
        if (hash(JSON.parse(prior.payload)) !== hash(payload)) throw new Error("LOCAL_JOB_INTENT_CONFLICT");
        return prior.id;
      }
      const pending = this.database.prepare("SELECT count(*) AS count FROM local_report_jobs WHERE status IN ('queued','running')").get() as { count: number };
      if (pending.count >= 100) throw new Error("LOCAL_QUEUE_FULL");
      const id = `run_local${randomBytes(16).toString("hex")}`;
      this.database.prepare("INSERT INTO local_report_jobs(id,intent,payload,status,created_at,updated_at) VALUES(?,?,?,'queued',?,?)").run(id, intent, JSON.stringify(payload), now, now);
      return id;
    }).immediate();
  }
  interruptExpired(now = Date.now()): Array<{ id: string; payload: WebDirectReportPayload }> {
    return this.database.transaction(() => {
      const expired = this.database.prepare("SELECT id,payload FROM local_report_jobs WHERE status='running' AND lease_until<=?").all(now) as Array<{ id: string; payload: string }>;
      this.database.prepare("UPDATE local_report_jobs SET status='interrupted',error_code='worker-lease-expired',updated_at=? WHERE status='running' AND lease_until<=?").run(now, now);
      return expired.flatMap(row => {const payload=this.storedPayload(row);return payload?[{id:row.id,payload}]:[];});
    }).immediate();
  }
  claim(now = Date.now()): LocalJob | null {
    return this.database.transaction(() => {
      if (this.database.prepare("SELECT 1 FROM local_report_jobs WHERE status='running'").get()) return null;
      const row = this.database.prepare("SELECT id,payload FROM local_report_jobs WHERE status='queued' AND confirmed=1 ORDER BY created_at,id LIMIT 1").get() as { id: string; payload: string } | undefined;
      if (!row) return null;
      const payload = this.storedPayload(row);
      if (!payload) return null;
      const token = randomBytes(24).toString("hex");
      this.database.prepare("UPDATE local_report_jobs SET status='running',token=?,lease_until=?,updated_at=? WHERE id=? AND status='queued'").run(token, now + LEASE_MS, now, row.id);
      return { id: row.id, payload, token };
    }).immediate();
  }
  assertLease(job: LocalJob, now = Date.now()) {
    if (!this.database.prepare("SELECT 1 FROM local_report_jobs WHERE id=? AND token=? AND status='running' AND lease_until>?").get(job.id, job.token, now)) throw new Error("LOCAL_WORKER_LEASE_LOST");
  }
  renew(job: LocalJob, now = Date.now()) {
    const result = this.database.prepare("UPDATE local_report_jobs SET lease_until=?,updated_at=? WHERE id=? AND token=? AND status='running' AND lease_until>?").run(now + LEASE_MS, now, job.id, job.token, now);
    if (result.changes !== 1) throw new Error("LOCAL_WORKER_LEASE_LOST");
  }
  loadPacket(job: LocalJob): StatePacket | null {
    this.assertLease(job);
    const row = this.database.prepare("SELECT packet FROM local_report_jobs WHERE id=?").get(job.id) as { packet: string | null };
    return row.packet ? JSON.parse(row.packet) : null;
  }
  savePacket(job: LocalJob, packet: StatePacket) {
    this.database.transaction(() => {
      this.assertLease(job);
      if (packet.ownerRunId !== job.id) throw new Error("LOCAL_STATE_OWNER_CONFLICT");
      const existing = this.database.prepare("SELECT revision FROM local_report_jobs WHERE id=?").get(job.id) as { revision: number };
      if (packet.revision <= existing.revision) throw new Error("LOCAL_STATE_REVISION_CONFLICT");
      const serialized = JSON.stringify(packet);
      this.database.prepare("UPDATE local_report_jobs SET packet=?,revision=?,updated_at=? WHERE id=?").run(serialized, packet.revision, Date.now(), job.id);
      const confirmed = this.database.prepare("SELECT packet FROM local_report_jobs WHERE id=?").get(job.id) as { packet: string };
      if (confirmed.packet !== serialized) throw new Error("LOCAL_STATE_COMMIT_UNCONFIRMED");
    }).immediate();
  }
  finish(job: LocalJob, status: "complete" | "failed", errorCode = "") {
    const now = Date.now();
    const result = this.database.prepare("UPDATE local_report_jobs SET status=?,error_code=?,updated_at=? WHERE id=? AND token=? AND status='running' AND lease_until>?").run(status, errorCode, now, job.id, job.token, now);
    if (result.changes !== 1) throw new Error("LOCAL_WORKER_LEASE_LOST");
  }
}
