import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { LocalProviderStore, initializeWorkerProviderVault, accountProviderEnabled, validProviderKey } from "../app/lib/local-provider-store.ts";
import { checkOpenAIProvider, SELF_HOST_REQUIRED_MODELS } from "../app/lib/check-openai-provider.ts";
import { providerSettingsRoute } from "../app/api/account/provider/route.ts";
import { executeAccountProviderJob, isolatedProviderEnvironment, LOCAL_PROVIDER_JOB_MAX_MS } from "../src/local/account-provider-job.ts";
import { accountResearchSetupMessage } from "../app/lib/local-report-dispatch.ts";
import { LocalReportQueue } from "../src/local/report-queue.ts";

const alice = { workspaceId: "alice-workspace", userId: "alice-user" };
const bob = { workspaceId: "bob-workspace", userId: "bob-user" };
const keyA = "sk-test-" + "A".repeat(40), keyB = "sk-test-" + "B".repeat(40);
const env = { MARKET_SIGNAL_DEPLOY_TARGET: "node", MARKET_SIGNAL_MODE: "self-hosted", MARKET_SIGNAL_EXECUTION_BACKEND: "local", MARKET_SIGNAL_ACCOUNT_PROVIDER: "true", MARKET_SIGNAL_LOCAL_HTTP: "true", BETTER_AUTH_URL: "http://localhost:8787", BETTER_AUTH_SECRET: "a".repeat(64) };
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "signals-provider-test-"));
  const path = join(root, "data.sqlite.providers.sqlite"), privateDir = join(root, "private");
  const store = new LocalProviderStore(path), privateKey = initializeWorkerProviderVault(store, privateDir);
  t.after(async () => { store.close(); await rm(root, { recursive: true, force: true }); });
  return { root, path, privateDir, privateKey, store };
}
function applyEnv(t, values) {
  const old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}
const request = (method = "GET", body, headers = {}) => new Request("http://localhost:8787/api/account/provider", { method, headers: { host: "localhost:8787", origin: "http://localhost:8787", "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
function services(path, owner = alice, check = async () => ({ ok: true })) { return { enabled: () => true, authorize: async () => owner && ({ workspaceId: owner.workspaceId, user: { id: owner.userId, name: "Test", email: "test@example.invalid" } }), openStore: () => new LocalProviderStore(path), check }; }

test("provider mode is explicit, self-host/local only; key syntax is bounded", () => {
  assert.equal(accountProviderEnabled(env), true);
  for (const change of [{ MARKET_SIGNAL_MODE: "hosted" }, { MARKET_SIGNAL_EXECUTION_BACKEND: "trigger" }, { MARKET_SIGNAL_ACCOUNT_PROVIDER: "false" }]) assert.equal(accountProviderEnabled({ ...env, ...change }), false);
  assert.equal(validProviderKey(keyA), true);
  for (const value of ["", "sk-short", "sk-" + "x".repeat(1100), keyA + "\n", null, "Bearer " + keyA]) assert.equal(validProviderKey(value), false);
});
test("sealed keys survive reopening; ciphertext, wrong owner, and tampering fail closed", async t => {
  const { store, privateKey, path, privateDir } = await fixture(t);
  const saved = store.save(alice, keyA, null);
  assert.equal(saved.lastFour, "AAAA"); assert.equal(store.decryptForWorkspace(alice.workspaceId, privateKey).apiKey, keyA);
  assert.equal(initializeWorkerProviderVault(store, privateDir), privateKey);
  const second = new LocalProviderStore(path);
  try { assert.equal(second.decryptForWorkspace(alice.workspaceId, privateKey).apiKey, keyA); } finally { second.close(); }
  const row = store.database.prepare("SELECT * FROM local_provider_keys").get();
  assert.ok(!JSON.stringify(row).includes(keyA)); assert.ok(!JSON.stringify(saved).includes(keyA));
  assert.equal(store.summary(bob).configured, false);
  assert.throws(() => store.summary({ ...alice, userId: bob.userId }), /unavailable/);
  store.database.prepare("UPDATE local_provider_keys SET user_id=?").run(bob.userId);
  assert.throws(() => store.decryptForWorkspace(alice.workspaceId, privateKey), /unavailable/);
  assert.ok(!(await readFile(path)).includes(Buffer.from(keyA)));
});
test("two accounts have independent keys; stale saves/removes cannot overwrite newer versions", async t => {
  const { store, privateKey } = await fixture(t);
  const a = store.save(alice, keyA, null); store.save(bob, keyB, null);
  assert.equal(store.decryptForWorkspace(bob.workspaceId, privateKey).apiKey, keyB);
  assert.throws(() => store.save(alice, keyB, null), /conflict/);
  const removed = store.remove(alice, a.version);
  assert.equal(removed.configured, false); assert.equal(removed.lastFour, "");
  assert.throws(() => store.decryptForWorkspace(alice.workspaceId, privateKey), /key-missing/);
  assert.throws(() => store.save(alice, keyB, a.version), /conflict/);
  assert.equal(store.decryptForWorkspace(bob.workspaceId, privateKey).apiKey, keyB);
  store.save(alice, keyA, removed.version);
});
test("missing worker private volume never silently replaces the decryption key", async t => {
  const { store, privateDir } = await fixture(t);
  store.save(alice, keyA, null);
  await unlink(join(privateDir, "private.pem"));
  assert.throws(() => initializeWorkerProviderVault(store, privateDir), /unavailable/);
});
test("validation uses fixed official metadata endpoints, rejects redirects, discards upstream bodies", async () => {
  const calls = [];
  assert.deepEqual(await checkOpenAIProvider(keyA, async (url, options) => { calls.push([url, options]); return new Response("{}", { status: 200 }); }), { ok: true });
  assert.equal(calls.length, SELF_HOST_REQUIRED_MODELS.length);
  for (const [url, options] of calls) { assert.match(String(url), /^https:\/\/api\.openai\.com\/v1\/models\//); assert.equal(options.method, "GET"); assert.equal(options.redirect, "error"); assert.equal(options.headers.Authorization, `Bearer ${keyA}`); assert.ok(options.signal); }
  for (const status of [301, 401, 403, 404, 429, 500]) {
    const result = await checkOpenAIProvider(keyA, async () => new Response(keyA, { status }));
    assert.equal(result.ok, false); assert.ok(!JSON.stringify(result).includes(keyA));
  }
  assert.equal((await checkOpenAIProvider(keyA, async () => { throw Error(keyA); })).ok, false);
});
test("settings enforce session, same origin, Host, body bounds, and never accept a provider URL", async t => {
  const { path } = await fixture(t); applyEnv(t, env);
  const deps = services(path);
  assert.equal((await providerSettingsRoute(request(), { ...deps, enabled: () => false })).status, 404);
  assert.equal((await providerSettingsRoute(request(), services(path, null))).status, 401);
  assert.equal((await providerSettingsRoute(request("POST", {}, { origin: "http://attacker.invalid" }), deps)).status, 403);
  assert.equal((await providerSettingsRoute(request("POST", {}, { host: "attacker.invalid" }), deps)).status, 403);
  assert.equal((await providerSettingsRoute(request("POST", { apiKey: "x".repeat(3000), expectedVersion: null }), deps)).status, 400);
  assert.equal((await providerSettingsRoute(request("POST", { apiKey: keyA, expectedVersion: null, baseUrl: "https://attacker.invalid" }), deps)).status, 400);
});
test("route saves only after successful validation and only returns masked metadata", async t => {
  const { path, store, privateKey } = await fixture(t); applyEnv(t, env);
  const deps = services(path);
  const response = await providerSettingsRoute(request("POST", { apiKey: keyA, expectedVersion: null }), deps);
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /no-store/);
  const text = await response.text(); assert.ok(!text.includes(keyA)); const saved = JSON.parse(text).settings;
  assert.equal(store.decryptForWorkspace(alice.workspaceId, privateKey).apiKey, keyA);
  const failed = await providerSettingsRoute(request("POST", { apiKey: keyB, expectedVersion: saved.version }), services(path, alice, async () => ({ ok: false, code: "invalid-key", message: "Invalid key." })));
  assert.equal(failed.status, 400); assert.equal(store.decryptForWorkspace(alice.workspaceId, privateKey).apiKey, keyA);
  assert.equal((await (await providerSettingsRoute(request(), services(path, bob))).json()).settings.configured, false);
  const deleted = await providerSettingsRoute(request("DELETE", { expectedVersion: saved.version }), deps);
  assert.equal(deleted.status, 200); assert.equal(store.summary(alice).configured, false);
});
test("concurrent validation cannot resurrect removed credentials", async t => {
  const { path, store } = await fixture(t); applyEnv(t, env);
  const saved = store.save(alice, keyA, null);
  const response = await providerSettingsRoute(request("POST", { apiKey: keyB, expectedVersion: saved.version }), services(path, alice, async () => { store.remove(alice, saved.version); return { ok: true }; }));
  assert.equal(response.status, 409); assert.equal(store.summary(alice).configured, false);
});
test("validation rate limits are per account and contain no credentials", async t => {
  const { path, store } = await fixture(t); applyEnv(t, env);
  const deps = services(path, alice, async () => ({ ok: false, code: "invalid-key", message: "Invalid key." }));
  for (let i = 0; i < 5; i++) assert.equal((await providerSettingsRoute(request("POST", { apiKey: keyA, expectedVersion: null }), deps)).status, 400);
  assert.equal((await providerSettingsRoute(request("POST", { apiKey: keyA, expectedVersion: null }), deps)).status, 429);
  assert.equal((await providerSettingsRoute(request("POST", { apiKey: keyB, expectedVersion: null }), services(path, bob))).status, 200);
  assert.ok(!JSON.stringify(store.database.prepare("SELECT * FROM local_provider_checks").all()).includes(keyA));
});
test("per-account preflight rejects missing keys before report creation, despite worker readiness", async t => {
  const { root, store } = await fixture(t);
  const environment = { ...env, MARKET_SIGNAL_SQLITE_PATH: join(root, "data.sqlite") };
  const queue = new LocalReportQueue(`${environment.MARKET_SIGNAL_SQLITE_PATH}.queue.sqlite`);
  try {
    queue.noteWorkerReady(Date.now(), true);
    assert.match(accountResearchSetupMessage(alice, environment), /Account → AI provider/);
    store.save(alice, keyA, null);
    assert.equal(accountResearchSetupMessage(alice, environment), null);
    assert.match(accountResearchSetupMessage(bob, environment), /Account → AI provider/);
    queue.noteWorkerReady(0);
    assert.match(accountResearchSetupMessage(alice, environment), /unavailable/);
  } finally { queue.close(); }
});
test("child environment cannot inherit operator credentials or custom endpoints", () => {
  const parent = { ...env, OPENAI_API_KEY: keyA, OPENAI_BASE_URL: "https://attacker.invalid", OPENAI_RESPONSES_BASE_URL: "https://attacker.invalid", OPENAI_ORG_ID: "company", MARKET_SIGNAL_DISCOVERY_MODEL: "company-model" };
  const child = isolatedProviderEnvironment(parent);
  assert.equal(child.OPENAI_API_KEY, undefined); assert.equal(child.OPENAI_BASE_URL, undefined);
  assert.equal(child.OPENAI_ORG_ID, undefined); assert.equal(child.MARKET_SIGNAL_DISCOVERY_MODEL, undefined);
  assert.equal(child.OPENAI_RESPONSES_BASE_URL, "https://api.openai.com/v1"); assert.equal(parent.OPENAI_API_KEY, keyA);
});
test("local child deadline is no shorter than the shared Trigger task execution ceiling", async () => {
  const task = await readFile(new URL("../src/trigger/web-direct-report.ts", import.meta.url), "utf8");
  const seconds = Number(/maxDuration:\s*([\d_]+)/.exec(task)[1].replaceAll("_", ""));
  assert.equal(LOCAL_PROVIDER_JOB_MAX_MS, seconds * 1000);
});
test("worker routes the trusted report owner's key, not a payload or another account's key", async t => {
  const { path, store, privateKey } = await fixture(t);
  store.save(alice, keyA, null); store.save(bob, keyB, null);
  let finished = 0;
  const queue = { assertLease() {}, finish() { finished++; } };
  const job = { id: "synthetic-job", payload: { publicId: "test", reportAttempt: 1, workspaceId: bob.workspaceId } };
  const launch = () => spawn(process.execPath, ["-e", "let data='';process.stdin.on('data',c=>{data+=c;if(data.includes('\\n')){const p=JSON.parse(data);process.exit(p.apiKey === 'sk-test-'+'A'.repeat(40) ? 0 : 2)}});process.stdin.on('end',()=>process.exit(3));"], { stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
  const deps = { lookupReport: async () => ({ run: { workspaceId: alice.workspaceId, attemptCount: 1 } }), openStore: () => new LocalProviderStore(path), launch };
  await executeAccountProviderJob(queue, job, privateKey, deps);
  assert.equal(finished, 0, "parent must not finish child-owned work");
  await assert.rejects(executeAccountProviderJob(queue, job, privateKey, { ...deps, lookupReport: async () => ({ run: { workspaceId: "", attemptCount: 1 } }) }));
  assert.equal(finished, 1, "unowned work fails before handoff");
  await assert.rejects(executeAccountProviderJob(queue, job, privateKey, { ...deps, launch: () => spawn(process.execPath, ["-e", "process.exit(2)"], { stdio: ["pipe", "ignore", "ignore"], windowsHide: true }) }));
  assert.equal(finished, 1, "crashed child leases expire instead of parent racing completion");
});
test("worker refuses mixed account/operator mode before doing work", () => {
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/local-worker.ts"], { cwd: resolve("."), env: { ...process.env, ...env, OPENAI_API_KEY: keyA }, encoding: "utf8", windowsHide: true, timeout: 15000 });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /cannot use an installation-wide/); assert.ok(!result.stderr.includes(keyA));
});
test("child exits when the supervising stdin pipe closes, without starting research", async () => {
  const child = spawn(process.execPath, ["--experimental-strip-types", "scripts/local-report-child.ts"], { env: isolatedProviderEnvironment({ ...process.env, ...env }), stdio: ["pipe", "ignore", "pipe"], windowsHide: true });
  let stderr = ""; child.stderr.on("data", chunk => { stderr += chunk; });
  const timer = setTimeout(() => child.kill("SIGKILL"), 15000);
  const exited = new Promise(resolve => child.on("exit", code => resolve(code)));
  child.stdin.end();
  try { assert.equal(await exited, 1); assert.ok(!stderr.includes(keyA)); } finally { clearTimeout(timer); }
});
test("account-mode setup is noninteractive and leaves provider configuration to the app", async t => {
  const root = await mkdtemp(join(tmpdir(), "signals-account-setup-")); t.after(() => rm(root, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [resolve("scripts/setup-local.mjs")], { cwd: root, env: { ...process.env, MARKET_SIGNAL_ACCOUNT_PROVIDER: "true", OPENAI_API_KEY: keyA }, encoding: "utf8", windowsHide: true, timeout: 15000 });
  assert.equal(result.status, 0); assert.match(result.stdout, /Account → AI provider/);
  assert.ok(!(await readFile(join(root, ".env"), "utf8")).includes(keyA));
  const denied = spawnSync(process.execPath, [resolve("scripts/setup-local.mjs"), "--set-key"], { cwd: root, env: { ...process.env, MARKET_SIGNAL_ACCOUNT_PROVIDER: "true" }, encoding: "utf8", windowsHide: true });
  assert.notEqual(denied.status, 0); assert.match(denied.stderr, /Account → AI provider/);
});
