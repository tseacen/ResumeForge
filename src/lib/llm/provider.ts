// Interface commune à tous les providers IA (CLI ou API distante).

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionParams {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  readonly name: string;
  readonly isAvailable: boolean;
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
}
