import { type AIProviderId } from "@/lib/schemas/settings.schema";

export const FALLBACK_MODELS: Record<Exclude<AIProviderId, "mock">, string[]> = {
  "claude-code": [
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
  ],
  "openai-codex": [
    "o4-mini",
    "o3",
    "o3-mini",
    "o1",
    "o1-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
  ],
};

type AnthropicModel = { id: string };
type OpenAIModel = { id: string };

async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Needed when calling from a browser/webview context
      "anthropic-dangerous-request-browser": "true",
    },
  });
  if (!res.ok) throw new Error(`Anthropic API: HTTP ${res.status}`);
  const data = (await res.json()) as { data: AnthropicModel[] };
  return data.data.map((m) => m.id).sort().reverse();
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI API: HTTP ${res.status}`);
  const data = (await res.json()) as { data: OpenAIModel[] };
  return data.data
    .map((m) => m.id)
    .filter((id) => /^(gpt-|o\d|codex)/.test(id))
    .sort()
    .reverse();
}

export type FetchModelsResult =
  | { ok: true; models: string[]; source: "api" | "fallback" }
  | { ok: false; error: string; models: string[]; source: "fallback" };

export async function fetchModelsForProvider(
  provider: AIProviderId,
  apiKey: string
): Promise<FetchModelsResult> {
  const fallback = provider === "mock" ? [] : (FALLBACK_MODELS[provider] ?? []);

  if (!apiKey.trim()) {
    return { ok: true, models: fallback, source: "fallback" };
  }

  try {
    let models: string[] = [];
    if (provider === "claude-code") models = await fetchAnthropicModels(apiKey);
    else if (provider === "openai-codex") models = await fetchOpenAIModels(apiKey);
    else return { ok: true, models: fallback, source: "fallback" };

    return { ok: true, models, source: "api" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Erreur inconnue";
    return { ok: false, error, models: fallback, source: "fallback" };
  }
}
