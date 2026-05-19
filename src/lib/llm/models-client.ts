import { type AIProviderId } from "@/lib/schemas/settings.schema";

// Fallback used when the remote API is unavailable (missing key, offline, etc.).
// Tauri compatibility: everything stays client-side, no /api/ route is involved.
const CURATED_FALLBACK: Record<Exclude<AIProviderId, "mock">, string[]> = {
  "claude-code": ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
  "openai-codex": ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex", "gpt-5.2"],
  "gemini-cli": [
    "auto-gemini-3",
    "gemini-3.1-pro-preview",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "auto-gemini-2.5",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ],
};

export interface FetchModelsResult {
  models: string[];
  source: "api" | "fallback" | "none";
  warning?: string;
}

interface AnthropicModelsResponse {
  data: Array<{ id: string }>;
}

interface OpenAIModelsResponse {
  data: Array<{ id: string }>;
}

interface GeminiModelsResponse {
  models: Array<{ name: string }>;
}

// Only reads explicitly public env vars to avoid leaking production keys.
function readPublicEnvKey(provider: Exclude<AIProviderId, "mock">): string | null {
  if (typeof process === "undefined") return null;
  const env = (process as { env?: Record<string, string | undefined> }).env ?? {};
  if (provider === "claude-code") return env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? null;
  if (provider === "openai-codex") return env.NEXT_PUBLIC_OPENAI_API_KEY ?? null;
  return env.NEXT_PUBLIC_GEMINI_API_KEY ?? null;
}

async function fetchAnthropic(apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  const data = (await res.json()) as AnthropicModelsResponse;
  return data.data
    .map((m) => m.id)
    .filter((id) => id.startsWith("claude-"))
    .sort()
    .reverse();
}

async function fetchOpenAI(apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}`);
  const data = (await res.json()) as OpenAIModelsResponse;
  return data.data
    .map((m) => m.id)
    .filter(
      (id) =>
        /^(gpt-|o\d|codex)/i.test(id) &&
        !/(embedding|tts|whisper|image|audio|moderation|realtime|search)/i.test(id)
    )
    .sort()
    .reverse();
}

async function fetchGemini(apiKey: string): Promise<string[]> {
  // Gemini API requires the key as a query param, not a header.
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const data = (await res.json()) as GeminiModelsResponse;
  return data.models
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((id) => id.startsWith("gemini-"))
    .sort()
    .reverse();
}

export async function fetchModelsForProvider(
  provider: AIProviderId,
  options?: { apiKey?: string }
): Promise<FetchModelsResult> {
  if (provider === "mock") return { models: [], source: "none" };

  const fallback = CURATED_FALLBACK[provider] ?? [];
  const apiKey = options?.apiKey?.trim() || readPublicEnvKey(provider) || "";

  if (!apiKey) {
    return { models: fallback, source: "fallback", warning: "no_api_key" };
  }

  try {
    const live =
      provider === "claude-code"
        ? await fetchAnthropic(apiKey)
        : provider === "openai-codex"
          ? await fetchOpenAI(apiKey)
          : await fetchGemini(apiKey);
    if (live.length === 0) {
      return { models: fallback, source: "fallback", warning: "empty_api_response" };
    }
    return { models: live, source: "api" };
  } catch (err) {
    return {
      models: fallback,
      source: "fallback",
      warning: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}
