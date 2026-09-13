import { selfHostedEnabled } from "./self-host-config.ts";
import { localHttpOrigin, localHttpRequestAllowed } from "./local-http.ts";

export function mutationRequestIsSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // The local TLS gateway forwards to an HTTP container. Compare against the
  // operator-owned canonical origin, never an untrusted forwarded Host header.
  if (selfHostedEnabled()) {
    const localOrigin = localHttpOrigin();
    if (localOrigin) return origin === localOrigin && localHttpRequestAllowed(request);
    try {
      const expected = new URL(process.env.BETTER_AUTH_URL || "");
      return Boolean(origin && expected.protocol === "https:" && new URL(origin).origin === expected.origin);
    } catch { return false; }
  }
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export async function readBoundedJsonObject(request: Request, maxBytes: number) {
  const bounded = Math.max(1, Math.trunc(maxBytes));
  const declaredValue = request.headers.get("content-length");
  if (declaredValue !== null) {
    const declared = Number(declaredValue);
    if (!Number.isSafeInteger(declared) || declared < 0 || declared > bounded) throw new Error("invalid-content-length");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error("missing-body");
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > bounded) {
      await reader.cancel();
      throw new Error("body-too-large");
    }
    body += decoder.decode(value, { stream: true });
  }
  const parsed = JSON.parse(body + decoder.decode()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid-json-object");
  return parsed as Record<string, unknown>;
}
