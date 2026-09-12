import { AbortTaskRunError, task } from "@trigger.dev/sdk";
import { PermanentOrchestrationError } from "../shared/report-orchestration-contract.ts";
import { createReportOrchestrationHttpPort } from "./report-orchestration-http.ts";
import { openWorkflowStore } from "../trigger-direct/workflow-runtime.ts";
import { runWebDirectReport } from "../trigger-direct/web-report-core.ts";
import type { WebDirectReportPayload } from "../shared/web-direct-report-contract.ts";

export const webDirectReport = task({
  id: "market-signal-web-direct-report", maxDuration: 14_700,
  retry: { maxAttempts: 10, minTimeoutInMs: 2000, maxTimeoutInMs: 20000, factor: 2, randomize: true },
  queue: { name: "market-signal-web-direct", concurrencyLimit: 4 },
  run: async (payload: WebDirectReportPayload, { ctx }) => {
    try {
      return await runWebDirectReport(payload, {
        website: createReportOrchestrationHttpPort({ appOrigin: process.env.MARKET_SIGNAL_APP_ORIGIN || "", callbackToken: process.env.MARKET_SIGNAL_CALLBACK_TOKEN || "" }),
        taskAttempt: ctx.attempt.number, maxAttempts: ctx.run.maxAttempts || 10,
        openStore: (request, identity) => openWorkflowStore(ctx.run.id, request, ctx.run.version || "", ctx.attempt.number, identity),
      });
    } catch (error) {
      if (error instanceof PermanentOrchestrationError) throw new AbortTaskRunError(error.message);
      throw error;
    }
  },
});
