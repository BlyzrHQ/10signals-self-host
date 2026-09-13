export type ProviderCheckResult = { ok: true } | { ok: false; code: "invalid-key" | "model-unavailable" | "provider-unavailable"; message: string };
export const SELF_HOST_REQUIRED_MODELS = ["gpt-5.6-luna", "gpt-5.4-mini", "text-embedding-3-small"] as const;

/** Metadata checks only. Never proxy user-selected hosts or echo provider responses. */
export async function checkOpenAIProvider(apiKey: string, fetcher: typeof fetch = fetch): Promise<ProviderCheckResult> {
  try {
    for (const model of SELF_HOST_REQUIRED_MODELS) {
      const response = await fetcher(`https://api.openai.com/v1/models/${model}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` }, redirect: "error", signal: AbortSignal.timeout(10_000),
      });
      await response.body?.cancel();
      if (response.status === 401) return { ok: false, code: "invalid-key", message: "OpenAI did not accept this API key. Check the key and try again." };
      if (response.status === 403 || response.status === 404) return { ok: false, code: "model-unavailable", message: `This key cannot view ${model}. Check the key's model permissions and Models read permission.` };
      if (!response.ok) return { ok: false, code: "provider-unavailable", message: "OpenAI could not verify the key right now. Your previous settings were not changed." };
    }
    return { ok: true };
  } catch { return { ok: false, code: "provider-unavailable", message: "OpenAI could not be reached. Your previous settings were not changed." }; }
}
