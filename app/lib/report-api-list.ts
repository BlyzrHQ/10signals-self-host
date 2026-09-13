import type { AccountContext } from "./account-auth.ts";
import { reportApiAccountContext, ReportApiAuthorizationError, reportApiAuthorizationErrorResponse, reportApiAuthenticationRequiredResponse } from "./report-api-auth.ts";
import { listWorkspaceReportSummaryPage } from "./report-query-service.ts";
import { PRIVATE_REPORT_HEADERS } from "./report-access.ts";

export type ReportListServices = {
  authorize: (request: Request) => Promise<AccountContext | null>;
  list: typeof listWorkspaceReportSummaryPage;
};

/** Account-scoped and read-only; listing does not reserve quota or dispatch. */
export async function listReportApi(request: Request, services: ReportListServices = {
  authorize: reportApiAccountContext, list: listWorkspaceReportSummaryPage,
}) {
  try {
    const account = await services.authorize(request);
    if (!account) return reportApiAuthenticationRequiredResponse("An account credential is required to list reports.");
    const url = new URL(request.url);
    const raw = url.searchParams.get("limit");
    const limit = raw === null ? 10 : Number(raw);
    const cursor = url.searchParams.get("cursor") || undefined;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50 || (cursor && cursor.length > 500)) {
      return Response.json({ok:false,errorCode:"invalid-page",error:"Use a limit from 1 to 50 and a returned cursor."},{status:400,headers:PRIVATE_REPORT_HEADERS});
    }
    const page = await services.list(account.workspaceId,{limit,cursor});
    return Response.json({ok:true,contractVersion:"1",page},{headers:PRIVATE_REPORT_HEADERS});
  } catch (error) {
    if (error instanceof ReportApiAuthorizationError) return reportApiAuthorizationErrorResponse(error);
    const invalid = error instanceof Error && /invalid.*cursor/i.test(error.message);
    return Response.json({ok:false,errorCode:invalid?"invalid-page":"reports-unavailable",error:invalid?"Invalid report cursor.":"Report history is temporarily unavailable."},{status:invalid?400:503,headers:PRIVATE_REPORT_HEADERS});
  }
}
