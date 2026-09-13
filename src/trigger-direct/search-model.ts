import { searchDirectProductPages } from "../../app/lib/competitor-discovery.ts";

// Server-owned and versioned with this worker, never selected by a customer's
// payload or a process-wide environment mutation shared with website tasks.
export const DIRECT_SEARCH_MODEL = "gpt-5.6-luna";

export const searchDirectWorkflowProductPages: typeof searchDirectProductPages =
  (domain, primary, country, feedback, scope) =>
    searchDirectProductPages(domain, primary, country, feedback, scope, DIRECT_SEARCH_MODEL);
