import { type LLMCompletionParams, type LLMCompletionResult, type LLMProvider } from "./provider";

export class MockProvider implements LLMProvider {
  readonly name = "mock";
  readonly isAvailable = true;

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const userContent = params.messages.find((m) => m.role === "user")?.content ?? "";
    let task = "unknown";
    try {
      const body = JSON.parse(userContent) as { task?: string };
      task = body.task ?? "unknown";
    } catch {
      // plain text prompt — leave task as "unknown"
    }
    return {
      content: MockProvider.responseForTask(task),
      model: "mock-v1",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  private static responseForTask(task: string): string {
    switch (task) {
      case "enhance_summary":
        return JSON.stringify({
          summary:
            "Experienced full-stack engineer with expertise in TypeScript, React, and Node.js. " +
            "Proven track record delivering scalable web applications and mentoring engineering teams.",
          classification: "rewritten",
          sourceFactIds: [],
        });

      case "explain_compatibility":
        return JSON.stringify({
          explanation:
            "Your profile shows solid alignment with this role. Your technical skills in TypeScript " +
            "and React directly address the core requirements. Consider strengthening seniority signals " +
            "and domain-specific terminology to improve ATS ranking and stand out to recruiters.",
        });

      case "propose_rewrites":
        return JSON.stringify({ rewrites: [] });

      default:
        return JSON.stringify({ content: "Mock provider response" });
    }
  }
}
