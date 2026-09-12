import { setTimeout as delay } from "node:timers/promises";
import { localExecutionEnabled } from "../app/lib/self-host-config.ts";
import { localQueuePath } from "../app/lib/local-report-dispatch.ts";
import { LocalReportQueue } from "../src/local/report-queue.ts";
import { executeLocalJob, recordInterruptedJob, confirmLocalDispatches } from "../src/local/report-worker.ts";

if (!localExecutionEnabled()) throw new Error("Local worker requires explicit self-hosted/local mode.");
if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("Set your own OPENAI_API_KEY before starting the research worker.");
const queue = new LocalReportQueue(localQueuePath());
queue.noteWorkerReady();
const presence = setInterval(() => queue.noteWorkerReady(), 10_000);
let stopping = false;
function stop() { stopping = true; clearInterval(presence); queue.noteWorkerReady(0); }
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
console.info("10Signals local worker ready; concurrency 1; automatic paid retries disabled.");
try {
  while (!stopping) {
    try {
    queue.interruptExpired();
    queue.expireUnconfirmed();
    for (const job of queue.unnotifiedTerminal()) {
      try { await recordInterruptedJob(job); queue.markNotified(job.id); }
      catch { queue.deferNotification(job.id); console.error(JSON.stringify({runId:job.id,errorCode:"terminal-notification-pending"})); }
    }
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
