import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN="https://10signals.xyz";
const RESOURCE=`${ORIGIN}/mcp`;
async function boundedJson(response) {
  if (!response.ok || !response.body) { await response.body?.cancel(); throw Error("METADATA_UNAVAILABLE"); }
  const reader=response.body.getReader(); const chunks=[];let size=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>128*1024)throw Error("METADATA_TOO_LARGE");chunks.push(value);}
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
/** Public discovery only: no key, login, account access, report or price check. */
export async function checkMcpConnection(fetchImpl=fetch) {
  const options={redirect:"error",signal:AbortSignal.timeout(15000),headers:{accept:"application/json"}};
  const resource=await boundedJson(await fetchImpl(`${ORIGIN}/.well-known/oauth-protected-resource/mcp`,options));
  if(resource.resource!==RESOURCE || !Array.isArray(resource.authorization_servers) || !resource.authorization_servers.includes(ORIGIN)) throw Error("RESOURCE_MISMATCH");
  const metadata=await boundedJson(await fetchImpl(`${ORIGIN}/.well-known/oauth-authorization-server`,{...options,signal:AbortSignal.timeout(15000)}));
  if(metadata.issuer!==ORIGIN || !["authorization_endpoint","token_endpoint"].every(name=>{
    try {const url=new URL(metadata[name]);return url.origin===ORIGIN&&!url.username&&!url.password;}catch{return false;}
  })) throw Error("AUTHORIZATION_METADATA_MISMATCH");
  const response=await fetchImpl(RESOURCE,{method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/list",params:{}})});
  const challenged=response.status===401 && /^Bearer\b/i.test(response.headers.get("www-authenticate")||"");
  await response.body?.cancel();
  if(!challenged) throw Error("AUTHENTICATION_CHALLENGE_MISSING");
  return {ok:true,endpoint:RESOURCE,discovery:"available",authentication:"required",paidCalls:0,clientLoginTested:false,toolsTested:false,
    next:"Add this remote MCP URL in a compatible OAuth client, sign in to your own account and approve only the scopes you need. This check is not an authenticated tool test."};
}
if(process.argv[1]&&resolve(process.argv[1]).toLowerCase()===fileURLToPath(import.meta.url).toLowerCase()) {
  checkMcpConnection().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    const known=["METADATA_UNAVAILABLE","METADATA_TOO_LARGE","RESOURCE_MISMATCH","AUTHORIZATION_METADATA_MISMATCH","AUTHENTICATION_CHALLENGE_MISSING"];
    console.error(JSON.stringify({ok:false,errorCode:known.includes(error.message)?error.message:"CONNECTION_CHECK_FAILED",paidCalls:0}));process.exitCode=1;
  });
}
