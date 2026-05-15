import { z } from "zod";

import { type ResumeFact } from "@/lib/schemas/resume.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

// ── Core interface ────────────────────────────────────────────────────────────

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

// ── Output schemas (validated after every LLM response) ──────────────────────

const EnhanceSummaryOutputSchema = z.object({
  summary: z.string().min(1),
  classification: z.enum(["rewritten", "inferred_safe"]),
  sourceFactIds: z.array(z.string()).default([]),
});

const ExplainCompatibilityOutputSchema = z.object({
  explanation: z.string().min(1),
});

const ProposeRewriteItemSchema = z.object({
  sourceId: z.string(),
  originalText: z.string(),
  newText: z.string(),
  classification: z.enum(["rewritten", "inferred_safe", "needs_user_validation"]),
  reason: z.string(),
});

const ProposeRewritesOutputSchema = z.object({
  rewrites: z.array(ProposeRewriteItemSchema),
});

export type EnhanceSummaryOutput = z.infer<typeof EnhanceSummaryOutputSchema>;
export type ExplainCompatibilityOutput = z.infer<typeof ExplainCompatibilityOutputSchema>;
export type ProposeRewriteItem = z.infer<typeof ProposeRewriteItemSchema>;
export type ProposeRewritesOutput = z.infer<typeof ProposeRewritesOutputSchema>;

// ── Internal JSON parser shared by all operations ────────────────────────────

function parseJsonResponse<T>(raw: string, schema: z.ZodType<T>): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some models wrap JSON in a markdown code block
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error(`LLM returned non-JSON response: ${raw.slice(0, 200)}`);
    }
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`LLM response failed schema validation: ${result.error.message}`);
  }
  return result.data;
}

// ── Higher-level operations ───────────────────────────────────────────────────

export interface EnhanceSummaryParams {
  currentSummary: string;
  matchedKeywords: string[];
  jobTitle: string | undefined;
  resumeFacts: ResumeFact[];
}

export async function enhanceSummary(
  provider: LLMProvider,
  params: EnhanceSummaryParams
): Promise<EnhanceSummaryOutput> {
  const result = await provider.complete({
    messages: [
      {
        role: "system",
        content:
          "You are a professional resume writer. Improve the summary using ONLY the provided facts. " +
          "Never invent skills, experience, or credentials not already present. " +
          "Respond with valid JSON matching the schema in the user message.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            task: "enhance_summary",
            currentSummary: params.currentSummary,
            matchedKeywords: params.matchedKeywords,
            jobTitle: params.jobTitle,
            availableFacts: params.resumeFacts.slice(0, 25).map((f) => ({
              id: f.id,
              text: f.text,
              category: f.category,
            })),
            outputSchema: {
              summary: "string — improved summary using only available facts",
              classification: "'rewritten' | 'inferred_safe'",
              sourceFactIds: "string[] — IDs of the facts used",
            },
          },
          null,
          2
        ),
      },
    ],
    temperature: 0.3,
    maxTokens: 512,
  });
  return parseJsonResponse(result.content, EnhanceSummaryOutputSchema);
}

export interface ExplainCompatibilityParams {
  score: CompatibilityScore;
  jobTitle: string | undefined;
  jobCompany: string | undefined;
}

export async function explainCompatibility(
  provider: LLMProvider,
  params: ExplainCompatibilityParams
): Promise<ExplainCompatibilityOutput> {
  const result = await provider.complete({
    messages: [
      {
        role: "system",
        content:
          "You are a senior recruiter. Write a plain-language explanation of a candidate compatibility score. " +
          "Be honest about gaps. Respond with valid JSON.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            task: "explain_compatibility",
            jobTitle: params.jobTitle,
            jobCompany: params.jobCompany,
            score: params.score,
            outputSchema: {
              explanation:
                "string — 2–3 paragraph explanation of the score, key strengths, and main gaps",
            },
          },
          null,
          2
        ),
      },
    ],
    temperature: 0.5,
    maxTokens: 800,
  });
  return parseJsonResponse(result.content, ExplainCompatibilityOutputSchema);
}

export interface ProposeRewritesParams {
  bullets: Array<{ id: string; text: string }>;
  jobTitle: string | undefined;
  matchedKeywords: string[];
}

export async function proposeRewrites(
  provider: LLMProvider,
  params: ProposeRewritesParams
): Promise<ProposeRewritesOutput> {
  const result = await provider.complete({
    messages: [
      {
        role: "system",
        content:
          "You are a professional resume writer. Rewrite the provided bullet points to better match the job. " +
          "Rules: never invent facts, metrics, or skills not present in the original text. " +
          "Classify each change: 'rewritten' (same meaning, better wording), " +
          "'inferred_safe' (low-risk expansion of existing context), or " +
          "'needs_user_validation' (candidate must confirm accuracy). " +
          "Respond with valid JSON.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            task: "propose_rewrites",
            jobTitle: params.jobTitle,
            matchedKeywords: params.matchedKeywords,
            bullets: params.bullets,
            outputSchema: {
              rewrites: [
                {
                  sourceId: "string — ID of the original bullet",
                  originalText: "string",
                  newText: "string — rewritten bullet",
                  classification: "'rewritten' | 'inferred_safe' | 'needs_user_validation'",
                  reason: "string — why this change was made",
                },
              ],
            },
          },
          null,
          2
        ),
      },
    ],
    temperature: 0.4,
    maxTokens: 1500,
  });
  return parseJsonResponse(result.content, ProposeRewritesOutputSchema);
}

// ── Provider factory ──────────────────────────────────────────────────────────

export type ProviderConfig =
  | { type: "mock" }
  | { type: "openai"; apiKey?: string; model?: string }
  | { type: "anthropic"; apiKey?: string; model?: string };

// Imported here to avoid circular value references at module init time.
// Provider files only import *types* from this module (erased at runtime).
import { AnthropicProvider } from "./anthropic-provider";
import { MockProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case "openai":
      return new OpenAIProvider(config.apiKey, config.model);
    case "anthropic":
      return new AnthropicProvider(config.apiKey, config.model);
    case "mock":
    default:
      return new MockProvider();
  }
}
