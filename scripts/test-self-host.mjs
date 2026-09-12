import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import https from "node:https";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

// Local-only acceptance smoke. No provider key, paid report, fixture publication,
// global TLS bypass or existing browser account is used.
const origin = new URL(process.env.SELF_HOST_TEST_ORIGIN || "https://localhost:8443");
if (origin.protocol !== "https:" || origin.hostname !== "localhost") throw Error("This smoke test only targets the local candidate.");
const ca = await readFile(process.env.SELF_HOST_TEST_CA || "outputs/self-host-root.crt");
const agent = new https.Agent({ ca });
const configuration=spawnSync("docker",["compose","--env-file",".env.self-host","-f","compose.self-host.yaml","--profile","research","config","--format","json"],{encoding:"utf8"});
assert.equal(configuration.status,0,"Candidate compose configuration must parse");
const services=JSON.parse(configuration.stdout).services;
assert.equal(Object.hasOwn(services.web.environment,"OPENAI_API_KEY"),false,"Provider key must not reach the web container");
assert.equal(Object.hasOwn(services.worker.environment,"BETTER_AUTH_SECRET"),false,"Browser auth secret must not reach the research worker");
function call(path, { method="GET", body, cookie, requestOrigin=origin.origin } = {}) {
  return new Promise((resolve,reject) => {
    const request = https.request(new URL(path,origin), { method, agent, headers: { origin:requestOrigin,
      ...(body ? {"content-type":"application/json"} : {}), ...(cookie ? {cookie} : {}) } }, response => {
      let raw="";
      response.on("data", chunk => { raw += chunk; if (raw.length > 2_000_000) request.destroy(Error("Response too large")); });
      response.on("end", () => { let data; try { data=JSON.parse(raw); } catch { data=null; } resolve({status:response.statusCode,data,raw,cookie:(response.headers["set-cookie"]||[]).map(s=>s.split(";")[0]).join("; ")}); });
    });
    request.setTimeout(15000,()=>request.destroy(Error("Request timeout")));
    request.on("error",reject); if(body)request.write(JSON.stringify(body));request.end();
  });
}
async function newAccount() {
  const response = await call("/api/auth/sign-up/email", {method:"POST",body:{name:"Isolated setup test",email:`setup-${randomBytes(8).toString("hex")}@example.invalid`,password:randomBytes(24).toString("hex")}});
  assert.ok([200,201].includes(response.status),`Signup returned ${response.status} ${response.data?.code||""}`);
  assert.ok(response.cookie,"Signup must establish a session");
  return response.cookie;
}
assert.equal((await call("/docs")).status,200);
const anonymous = await call("/api/reports",{method:"POST",body:{primaryDomain:"example.com",comparisonTarget:20}});
assert.equal(anonymous.status,401);
const owner = await newAccount(); const other = await newAccount();
const account = await call("/api/billing/subscription",{cookie:owner});
assert.equal(account.status,200); assert.equal(account.data.mode,"self-hosted"); assert.equal(account.data.subscription,null);
const result = await call("/api/reports",{method:"POST",cookie:owner,body:{primaryDomain:"example.com",comparisonTarget:20,commandId:`setup-${randomBytes(8).toString("hex")}`}});
assert.equal(result.status,503,"No provider is installed: report must not start");
assert.equal(result.data.errorCode,"dispatch-failed");
assert.ok(result.data.publicId,"Failed attempt remains inspectable by its owner");
const id = result.data.publicId;
assert.equal((await call(`/api/reports/${id}`,{cookie:owner})).status,200);
assert.ok([401,404].includes((await call(`/api/reports/${id}`)).status));
assert.equal((await call(`/api/reports/${id}`,{cookie:other})).status,404);
const history = await call("/api/account/reports",{cookie:owner});
assert.equal(history.status,200); assert.ok(history.data.reports.some(report=>report.publicId===id));
const otherHistory = await call("/api/account/reports",{cookie:other});
assert.equal(otherHistory.status,200); assert.ok(!otherHistory.data.reports.some(report=>report.publicId===id));
assert.equal((await call(`/api/reports/${id}/sharing`,{cookie:owner})).status,409,"A failed report must not become shareable");
assert.equal((await call(`/api/reports/${id}/sharing`,{cookie:other})).status,404);
assert.match(result.data.error,/provider key/);
assert.equal((await call("/api/account/api-keys",{cookie:owner})).status,404);
assert.equal((await call("/api/price-watch",{cookie:owner})).status,404);
const restart = spawnSync("docker",["compose","--env-file",".env.self-host","-f","compose.self-host.yaml","restart","web"],{encoding:"utf8"});
assert.equal(restart.status,0,"Candidate restart failed");
let restarted;
for(let i=0;i<30;i++){try{restarted=await call(`/api/reports/${id}`,{cookie:owner});if(restarted.status===200)break;}catch{}await delay(1000);}
assert.equal(restarted?.status,200,"Session and owned report must survive restart");
console.log(JSON.stringify({ok:true,realResearch:false,paidCalls:0,checks:["TLS verified with instance CA","fresh accounts","anonymous creation denied","provider missing: no job launched","owner report access","other-account denied","unshared anonymous access denied","unfinished integrations closed","account and report survive restart"]},null,2));
agent.destroy();
