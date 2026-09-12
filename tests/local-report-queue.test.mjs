import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalReportQueue } from "../src/local/report-queue.ts";
import { initialState, encodeState, decodeState, WorkflowStore } from "../src/trigger-direct/workflow-state.ts";
import { webDirectRequest } from "../src/shared/web-direct-report-contract.ts";
import { selfHostEnvironment } from "../scripts/setup-self-host.mjs";
import { accountAuthConfigFromEnvironment } from "../app/lib/account-auth.ts";
import { reportCreationDependencies, createPersistentReport } from "../app/api/reports/route.ts";
import { reportRouteDependencies } from "../app/api/reports/[publicId]/route.ts";
import { reportMatchesDependencies } from "../app/api/reports/[publicId]/matches/route.ts";

const payload = (id = "a") => ({ contractVersion: "1", publicId: id.repeat(32), primaryDomain: "shop.example", locale: "en", reportAttempt: 1,
  productPlan: "starter", productLimit: 20, researchOptions: { engine: "direct-trigger", includeAnalysis: false } });
async function queue(t) {
  const dir = await mkdtemp(join(tmpdir(), "signals-local-queue-"));
  const path = join(dir, "queue.sqlite");
  const q = new LocalReportQueue(path);
  const connections = [q];
  t.after(async () => { for (const item of connections) if (item.database.open) item.close(); await rm(dir, { recursive: true, force: true }); });
  return { q, path, open: () => { const next = new LocalReportQueue(path); connections.push(next); return next; } };
}
test("local queue persists, deduplicates intent, and admits only one active worker", async t => {
  const {q,open} = await queue(t);
  const now = Date.now();
  const id = q.enqueue(payload(), now - 3000);
  assert.equal(q.claim(now), null, "unconfirmed intent cannot start paid work");
  q.confirm(id);
  assert.equal(q.enqueue(payload(), now), id);
  assert.throws(() => q.enqueue({...payload(), primaryDomain: "other.example"}), /INTENT_CONFLICT/);
  q.confirm(q.enqueue(payload("b"), now - 2900));
  const second = open();
  const job = q.claim(now);
  assert.equal(job.id, id);
  assert.equal(second.claim(now), null);
  assert.throws(() => second.finish({...job,token:"wrong"},"complete"), /LEASE_LOST/);
  q.finish(job, "complete");
  assert.equal(second.claim(now).payload.publicId, "b".repeat(32));
});
test("expired work is interrupted, not requeued; stale writers cannot publish checkpoints", async t => {
  const {q} = await queue(t);
  const now = Date.now();
  q.confirm(q.enqueue(payload(), now - 3000));
  const job = q.claim(now);
  assert.equal(q.interruptExpired(now + 60001).length, 1);
  assert.equal(q.unnotifiedTerminal().length, 1, "terminal publication survives a failed notification attempt");
  assert.equal(q.unnotifiedTerminal().length, 1);
  q.markNotified(job.id);
  assert.equal(q.unnotifiedTerminal().length, 0);
  assert.throws(() => q.finish(job,"complete"), /LEASE_LOST/);
  assert.equal(q.claim(now + 60001), null);
  assert.throws(() => q.renew(job), /LEASE_LOST/);
  assert.throws(() => q.savePacket(job, encodeState(initialState(job.id, webDirectRequest(job.payload)))), /LEASE_LOST/);
  assert.equal(q.enqueue(payload()), job.id);
});
test("workflow snapshots survive reopening; ambiguous paid operation is not retried", async t => {
  const {q,open} = await queue(t);
  q.confirm(q.enqueue(payload(), Date.now() - 3000));
  const job = q.claim();
  const request = webDirectRequest(job.payload);
  const state = initialState(job.id, request);
  q.savePacket(job, encodeState(state));
  const store = new WorkflowStore(state, async packet => q.savePacket(job,packet));
  let calls = 0;
  await assert.rejects(store.operation("paid:test", async () => { calls++; throw Error("uncertain"); }));
  const second = open();
  const restored = new WorkflowStore(decodeState(second.loadPacket(job), job.id, request), async packet => second.savePacket(job,packet));
  await assert.rejects(restored.operation("paid:test", async () => { calls++; }), /AMBIGUOUS/);
  assert.equal(calls, 1);
});
test("clean self-host config has no company connection and refuses secret injection", () => {
  const env = selfHostEnvironment();
  assert.match(env,/MARKET_SIGNAL_MODE=self-hosted/);
  assert.match(env,/https:\/\/localhost:8443/);
  assert.doesNotMatch(env,/10signals\.xyz|blyzr|TRIGGER_SECRET_KEY|STRIPE_/i);
  assert.notEqual(env,selfHostEnvironment());
  for (const key of ["x\nTRIGGER_SECRET_KEY=oops", "x'", "x\0"]) assert.throws(() => selfHostEnvironment({providerKey:key}));
  assert.throws(() => selfHostEnvironment({port:80}));
});

test("unconfirmed dispatches expire without research and poisoned rows are quarantined", async t => {
  const {q} = await queue(t);
  const now=Date.now(); const id=q.enqueue(payload(),now-301000);
  q.expireUnconfirmed(now);
  assert.equal(q.claim(),null); assert.equal(q.unnotifiedTerminal()[0].error_code,"dispatch-unconfirmed");
  q.deferNotification(id); assert.equal(q.unnotifiedTerminal().length,0);
  const broken=q.enqueue(payload("b"));
  q.database.prepare("UPDATE local_report_jobs SET payload='invalid JSON' WHERE id=?").run(broken);
  assert.deepEqual(q.awaitingConfirmation(),[]);
  assert.equal(q.database.prepare("SELECT error_code FROM local_report_jobs WHERE id=?").get(broken).error_code,"invalid-saved-payload");
});
test("self-host mode requires an account and disables signup unless explicitly opened", async () => {
  const env = {MARKET_SIGNAL_MODE:"self-hosted",MARKET_SIGNAL_DEPLOY_TARGET:"node",MARKET_SIGNAL_SQLITE_PATH:"/tmp/test.sqlite",BETTER_AUTH_URL:"https://localhost:8443",BETTER_AUTH_SECRET:"x".repeat(32)};
  assert.equal(accountAuthConfigFromEnvironment(env).allowSignUp,false);
  assert.equal(accountAuthConfigFromEnvironment({...env,MARKET_SIGNAL_SELF_HOST_ALLOW_SIGNUP:"true"}).allowSignUp,true);
  assert.equal(reportCreationDependencies(env).requireAccount,true);
  let created = false;
  const response = await createPersistentReport(new Request("https://localhost:8443/api/reports",{method:"POST",body:JSON.stringify({primaryDomain:"shop.example"})}),{
    requireAccount:true,authorize:async()=>null,create:async()=>{created=true;},
  });
  assert.equal(response.status,401); assert.equal(created,false);
});

test("self-host mode never enables legacy public access or remote report recovery", async () => {
  const previous=process.env.MARKET_SIGNAL_MODE;
  process.env.MARKET_SIGNAL_MODE="self-hosted";
  try {
    assert.equal(reportRouteDependencies().allowLegacyPublic(),false);
    assert.equal(reportMatchesDependencies().allowLegacyPublic(),false);
    assert.equal(await reportRouteDependencies().recover("a".repeat(32),{enabled:"true",baseUrl:"https://legacy.example",sunsetAt:"2099-01-01",fetchImpl:()=>{throw Error("unexpected remote call");}}),null);
  } finally {
    if(previous===undefined) delete process.env.MARKET_SIGNAL_MODE;
    else process.env.MARKET_SIGNAL_MODE=previous;
  }
});
