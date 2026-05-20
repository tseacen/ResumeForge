import { type LLMCompletionParams, type LLMCompletionResult, type LLMMessage, type LLMProvider } from "./provider";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly isAvailable: boolean;

  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = model ?? DEFAULT_MODEL;
    this.isAvailable = this.apiKey.length > 0;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    if (!this.isAvailable) {
      throw new Error("Anthropic provider: no API key configured (set ANTHROPIC_API_KEY)");
    }

    const systemMsg = params.messages.find((m) => m.role === "system")?.content;
    const userMessages: LLMMessage[] = params.messages.filter((m) => m.role !== "system");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: params.maxTokens ?? 1000,
        ...(systemMsg ? { system: systemMsg } : {}),
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const content = data.content.find((c) => c.type === "text")?.text ?? "";
    const usage = data.usage
      ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
      : undefined;

    return { content, model: data.model, usage };
  }
}
