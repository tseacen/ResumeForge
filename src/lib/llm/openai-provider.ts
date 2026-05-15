import { type LLMCompletionParams, type LLMCompletionResult, type LLMProvider } from "./provider";

const DEFAULT_MODEL = "gpt-4o-mini";
const API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  choices: Array<{ message: { content: string } }>;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly isAvailable: boolean;

  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = model ?? DEFAULT_MODEL;
    this.isAvailable = this.apiKey.length > 0;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    if (!this.isAvailable) {
      throw new Error("OpenAI provider: no API key configured (set OPENAI_API_KEY)");
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.4,
        max_tokens: params.maxTokens ?? 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices[0]?.message?.content ?? "";
    const usage = data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined;

    return { content, model: data.model, usage };
  }
}
