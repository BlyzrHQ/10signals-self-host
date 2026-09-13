import { setTimeout as delay } from "node:timers/promises";
import { localExecutionEnabled } from "../app/lib/self-host-config.ts";
import { localQueuePath } from "../app/lib/local-report-dispatch.ts";
import { LocalReportQueue } from "../src/local/report-queue.ts";
import { executeLocalJob, maintainLocalQueue, confirmLocalDispatches } from "../src/local/report-worker.ts";

if (!localExecutionEnabled()) throw new Error("Local worker requires explicit self-hosted/local mode.");
const researchEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
const queue = new LocalReportQueue(localQueuePath());
queue.noteWorkerReady(Date.now(), researchEnabled);
const presence = setInterval(() => queue.noteWorkerReady(Date.now(), researchEnabled), 10_000);
let stopping = false;
function stop() { stopping = true; clearInterval(presence); queue.noteWorkerReady(0); }
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
console.info(researchEnabled ? "10Signals local worker ready; concurrency 1; automatic paid retries disabled." : "10Signals is installed. Research is disabled: configure your provider key with setup --set-key, then restart the worker.");
try {
  while (!stopping) {
    try {
    await maintainLocalQueue(queue, researchEnabled);
    if (!researchEnabled) { await delay(1000); continue; }
    try { await confirmLocalDispatches(queue); }
    catch { console.error(JSON.stringify({errorCode:"dispatch-confirmation-pending"})); await delay(1000); continue; }
    const job = queue.claim();
    if (!job) { await delay(1000); continue; }
    console.info(JSON.stringify({ runId: job.id, status: "running" }));
    try { await executeLocalJob(queue, job); console.info(JSON.stringify({ runId: job.id, status: "terminal" })); }
    catch { console.error(JSON.stringify({ runId: job.id, status: "failed", errorCode: "local-report-failed" })); }
    } catch { console.error(JSON.stringify({errorCode:"local-queue-unavailable"})); await delay(5000); }
  }
} finally { clearInterval(presence); queue.close(); }
