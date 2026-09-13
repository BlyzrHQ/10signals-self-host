import { McpServer, createMcpHandler, type AuthInfo, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import { mcpPrincipalFromAuthInfo } from "./mcp-token-verifier.ts";
import { mcpReadServices, registerReportTools, safeToolFailure, successfulToolResult, outcomeToolResult, type McpReadServices } from "./mcp-read-server.ts";
import { LocalMcpError } from "./local-mcp-store.ts";
import { confirmLocalReport, previewLocalReport, localMcpServices, type LocalMcpServices } from "./local-mcp-service.ts";

function failure(error: unknown, tool: string): CallToolResult {
  return error instanceof LocalMcpError
    ? outcomeToolResult({ ok: false, error: { code: error.code, message: error.message } }) : safeToolFailure(error, tool);
}
export function createLocalMcpHandler(origin: string, reads: McpReadServices = mcpReadServices(), services: LocalMcpServices = localMcpServices()) {
  return createMcpHandler(({ authInfo }: { authInfo?: AuthInfo }) => {
    const server = new McpServer({ name: "10signals-local", version: "1.0.0" }, { capabilities: { tools: {} } });
    const principal = mcpPrincipalFromAuthInfo(authInfo);
    if (!principal || !authInfo) return server;
    server.registerTool("account_status", { title: "Local account status", description: "Check this local account’s provider and worker readiness. No research or hosted account access.",
      inputSchema: z.object({}).strict(), annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
    async () => { try { return successfulToolResult({ ok: true, mode: "self-hosted", execution: "local", scopes: authInfo.scopes,
      ...await services.status(principal), endpoint: `${origin}/mcp`, scheduledPriceWatches: false }); } catch (error) { return failure(error, "account_status"); } });
    if (authInfo.scopes.includes("reports:read")) registerReportTools(server, principal, reads, origin);
    if (authInfo.scopes.includes("reports:create")) {
      server.registerTool("report_create_preview", { title: "Preview a local report", description: "Validate a public domain, account provider and research options. Starts no research. Show the preview to the user and obtain approval before confirmation.",
        inputSchema: z.object({ primaryDomain: z.string().min(1).max(2048), locale: z.enum(["en", "ar"]).default("en"),
          comparisons: z.union([z.literal(20), z.literal(50), z.literal(500), z.literal(1000)]).default(20),
          closePricePercent: z.number().int().min(1).max(90).optional(), includeAnalysis: z.boolean().default(false) }).strict(),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
      async input => { try { return successfulToolResult(await previewLocalReport(principal, input, services)); } catch (error) { return failure(error, "report_create_preview"); } });
      server.registerTool("report_create_confirm", { title: "Confirm a local report", description: "After user approval, submit a five-minute preview token to start one report with this local account’s OpenAI key. Retry the same token to recover its outcome. Poll report_get, then retrieve structured comparisons with report_matches_list.",
        inputSchema: z.object({ confirmationToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } },
      async ({ confirmationToken }) => { try { return outcomeToolResult(await confirmLocalReport(principal, confirmationToken, origin, services)); } catch (error) { return failure(error, "report_create_confirm"); } });
    }
    return server;
  }, { legacy: "stateless", responseMode: "auto", onerror: () => console.error("Local MCP protocol request failed.") });
}
