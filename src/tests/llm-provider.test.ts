import { describe, expect, it } from "vitest";

import { MockProvider } from "@/lib/llm/mock-provider";
import {
  createProvider,
  enhanceSummary,
  explainCompatibility,
  proposeRewrites,
  type LLMCompletionParams,
  type LLMCompletionResult,
  type LLMProvider,
} from "@/lib/llm/provider";
import { type ParsedResume } from "@/lib/schemas/resume.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

// ── Test helpers ──────────────────────────────────────────────────────────────

class FixedResponseProvider implements LLMProvider {
  readonly name = "fixed";
  readonly isAvailable = true;
  constructor(private readonly response: string) {}
  async complete(_p: LLMCompletionParams): Promise<LLMCompletionResult> {
    return { content: this.response, model: "fixed-v1" };
  }
}

function makeResume(): ParsedResume {
  return {
    rawHtml: "",
    facts: [
      {
        id: "f1",
        source: "resume_html",
        category: "summary",
        text: "Experienced developer with 5 years building web apps",
        normalizedKeywords: ["experienced", "developer", "building", "web", "apps"],
        confidence: 1,
      },
      {
        id: "f2",
        source: "resume_html",
        category: "skill",
        text: "TypeScript",
        normalizedKeywords: ["typescript"],
        confidence: 1,
      },
    ],
    parsedAt: new Date().toISOString(),
  };
}

const SAMPLE_SCORE: CompatibilityScore = {
  global: 72,
  ats: 65,
  recruiterFit: 70,
  technicalFit: 80,
  seniorityFit: 60,
  marketFit: 70,
  riskLevel: "medium",
  strengths: ["TypeScript", "React"],
  weaknesses: ["Kubernetes"],
  blockers: [],
  missingKeywords: ["Kubernetes"],
  interviewRisks: [],
};

// ── createProvider ────────────────────────────────────────────────────────────

describe("createProvider", () => {
  it("returns a mock provider for type=mock", () => {
    const p = createProvider({ type: "mock" });
    expect(p.name).toBe("mock");
    expect(p.isAvailable).toBe(true);
  });

  it("returns an openai provider for type=openai", () => {
    const p = createProvider({ type: "openai", apiKey: "" });
    expect(p.name).toBe("openai");
  });

  it("returns an anthropic provider for type=anthropic", () => {
    const p = createProvider({ type: "anthropic", apiKey: "" });
    expect(p.name).toBe("anthropic");
  });

  it("openai provider has isAvailable=false without an API key", () => {
    const p = createProvider({ type: "openai", apiKey: "" });
    expect(p.isAvailable).toBe(false);
  });

  it("anthropic provider has isAvailable=false without an API key", () => {
    const p = createProvider({ type: "anthropic", apiKey: "" });
    expect(p.isAvailable).toBe(false);
  });

  it("openai provider has isAvailable=true when an API key is provided", () => {
    const p = createProvider({ type: "openai", apiKey: "sk-test-key" });
    expect(p.isAvailable).toBe(true);
  });

  it("anthropic provider has isAvailable=true when an API key is provided", () => {
    const p = createProvider({ type: "anthropic", apiKey: "sk-ant-test" });
    expect(p.isAvailable).toBe(true);
  });
});

// ── MockProvider ──────────────────────────────────────────────────────────────

describe("MockProvider", () => {
  it("complete() returns a valid LLMCompletionResult", async () => {
    const mock = new MockProvider();
    const result = await mock.complete({
      messages: [{ role: "user", content: JSON.stringify({ task: "enhance_summary" }) }],
    });
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.model).toBe("mock-v1");
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("returns parseable JSON for enhance_summary", async () => {
    const mock = new MockProvider();
    const { content } = await mock.complete({
      messages: [{ role: "user", content: JSON.stringify({ task: "enhance_summary" }) }],
    });
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("classification");
    expect(parsed).toHaveProperty("sourceFactIds");
  });

  it("returns parseable JSON for explain_compatibility", async () => {
    const mock = new MockProvider();
    const { content } = await mock.complete({
      messages: [{ role: "user", content: JSON.stringify({ task: "explain_compatibility" }) }],
    });
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed).toHaveProperty("explanation");
  });

  it("returns parseable JSON for propose_rewrites", async () => {
    const mock = new MockProvider();
    const { content } = await mock.complete({
      messages: [{ role: "user", content: JSON.stringify({ task: "propose_rewrites" }) }],
    });
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed).toHaveProperty("rewrites");
    expect(Array.isArray(parsed.rewrites)).toBe(true);
  });

  it("handles plain text prompt without throwing", async () => {
    const mock = new MockProvider();
    const result = await mock.complete({
      messages: [{ role: "user", content: "not json" }],
    });
    expect(typeof result.content).toBe("string");
  });
});

// ── enhanceSummary ────────────────────────────────────────────────────────────

describe("enhanceSummary", () => {
  it("returns a valid EnhanceSummaryOutput with mock provider", async () => {
    const result = await enhanceSummary(new MockProvider(), {
      currentSummary: "Experienced developer.",
      matchedKeywords: ["typescript", "react"],
      jobTitle: "Senior Engineer",
      resumeFacts: makeResume().facts,
    });
    expect(result.summary.length).toBeGreaterThan(10);
    expect(["rewritten", "inferred_safe"]).toContain(result.classification);
    expect(Array.isArray(result.sourceFactIds)).toBe(true);
  });

  it("throws when provider returns invalid JSON", async () => {
    await expect(
      enhanceSummary(new FixedResponseProvider("this is not json"), {
        currentSummary: "Test",
        matchedKeywords: [],
        jobTitle: undefined,
        resumeFacts: [],
      })
    ).rejects.toThrow();
  });

  it("throws when provider returns JSON that fails schema validation", async () => {
    await expect(
      enhanceSummary(new FixedResponseProvider(JSON.stringify({ wrong: "field" })), {
        currentSummary: "Test",
        matchedKeywords: [],
        jobTitle: undefined,
        resumeFacts: [],
      })
    ).rejects.toThrow(/schema validation/);
  });

  it("handles markdown-wrapped JSON from provider", async () => {
    const wrapped = new FixedResponseProvider(
      "```json\n" +
        JSON.stringify({
          summary: "Improved summary text.",
          classification: "rewritten",
          sourceFactIds: [],
        }) +
        "\n```"
    );
    const result = await enhanceSummary(wrapped, {
      currentSummary: "Test",
      matchedKeywords: [],
      jobTitle: undefined,
      resumeFacts: [],
    });
    expect(result.summary).toBe("Improved summary text.");
  });
});

// ── explainCompatibility ──────────────────────────────────────────────────────

describe("explainCompatibility", () => {
  it("returns a valid ExplainCompatibilityOutput with mock provider", async () => {
    const result = await explainCompatibility(new MockProvider(), {
      score: SAMPLE_SCORE,
      jobTitle: "Senior Engineer",
      jobCompany: "TechCorp",
    });
    expect(result.explanation.length).toBeGreaterThan(20);
  });

  it("throws when provider returns JSON with missing explanation field", async () => {
    await expect(
      explainCompatibility(new FixedResponseProvider(JSON.stringify({ summary: "wrong" })), {
        score: SAMPLE_SCORE,
        jobTitle: undefined,
        jobCompany: undefined,
      })
    ).rejects.toThrow(/schema validation/);
  });
});

// ── proposeRewrites ───────────────────────────────────────────────────────────

describe("proposeRewrites", () => {
  it("returns a valid ProposeRewritesOutput with mock provider", async () => {
    const result = await proposeRewrites(new MockProvider(), {
      bullets: [{ id: "b1", text: "Built a payment service" }],
      jobTitle: "Senior Engineer",
      matchedKeywords: ["react", "typescript"],
    });
    expect(Array.isArray(result.rewrites)).toBe(true);
  });

  it("returns valid rewrites when provider proposes changes", async () => {
    const provider = new FixedResponseProvider(
      JSON.stringify({
        rewrites: [
          {
            sourceId: "b1",
            originalText: "Built a payment service",
            newText: "Architected and delivered a high-availability payment microservice",
            classification: "inferred_safe",
            reason: "Improved specificity and action verb strength",
          },
        ],
      })
    );
    const result = await proposeRewrites(provider, {
      bullets: [{ id: "b1", text: "Built a payment service" }],
      jobTitle: "Senior Engineer",
      matchedKeywords: [],
    });
    expect(result.rewrites).toHaveLength(1);
    expect(result.rewrites[0].sourceId).toBe("b1");
    expect(["rewritten", "inferred_safe", "needs_user_validation"]).toContain(
      result.rewrites[0].classification
    );
  });

  it("handles empty bullets list without throwing", async () => {
    const result = await proposeRewrites(new MockProvider(), {
      bullets: [],
      jobTitle: undefined,
      matchedKeywords: [],
    });
    expect(Array.isArray(result.rewrites)).toBe(true);
  });
});

// ── Provider stubs reject calls without API key ───────────────────────────────

describe("provider stubs without API key", () => {
  it("OpenAI provider throws on complete() when isAvailable=false", async () => {
    const p = createProvider({ type: "openai", apiKey: "" });
    await expect(
      p.complete({ messages: [{ role: "user", content: "test" }] })
    ).rejects.toThrow(/no API key/);
  });

  it("Anthropic provider throws on complete() when isAvailable=false", async () => {
    const p = createProvider({ type: "anthropic", apiKey: "" });
    await expect(
      p.complete({ messages: [{ role: "user", content: "test" }] })
    ).rejects.toThrow(/no API key/);
  });
});
