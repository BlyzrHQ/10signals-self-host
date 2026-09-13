import { localExecutionEnabled } from "./self-host-config.ts";

/** HTTP is exclusively an opt-in, loopback-published Docker quickstart. */
export function localHttpOrigin(environment: Record<string, string | undefined> = process.env): string | null {
  if (!localExecutionEnabled(environment) || environment.MARKET_SIGNAL_LOCAL_HTTP !== "true") return null;
  try {
    const url = new URL(environment.BETTER_AUTH_URL || "");
    if (url.protocol !== "http:" || url.hostname !== "localhost" || !url.port
      || Number(url.port) < 1024 || url.pathname !== "/" || url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function localHttpRequestAllowed(request: Request, environment: Record<string, string | undefined> = process.env) {
  if (environment.MARKET_SIGNAL_LOCAL_HTTP !== "true") return true;
  const origin = localHttpOrigin(environment);
  if (!origin) return false;
  // Do not trust X-Forwarded-Host/Proto. The loopback gateway preserves Host.
  if (request.headers.get("host") !== new URL(origin).host) return false;
  const suppliedOrigin = request.headers.get("origin");
  if (suppliedOrigin !== null && suppliedOrigin !== origin) return false;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && suppliedOrigin !== origin) return false;
  return true;
}
