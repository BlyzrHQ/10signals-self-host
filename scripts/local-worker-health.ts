import { LocalReportQueue } from "../src/local/report-queue.ts";
import { localQueuePath } from "../app/lib/local-report-dispatch.ts";
const queue = new LocalReportQueue(localQueuePath());
try {
  // An intentionally disabled worker is healthy, but not research-ready.
  process.exitCode = queue.workerStatus() === "unavailable" ? 1 : 0;
} finally { queue.close(); }
