import { z } from "zod";

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) return fence[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export function parseLlmJson<T>(raw: string, schema: z.ZodType<T>): T {
  const candidate = extractJsonCandidate(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    throw new Error(
      `LLM returned non-JSON output. Detail: ${err instanceof Error ? err.message : String(err)}. Raw response (first 300 chars): ${raw.slice(0, 300)}`
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `LLM response does not match the expected schema. ${result.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" — ")}`
    );
  }
  return result.data;
}
