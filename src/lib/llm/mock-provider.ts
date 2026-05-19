import { type LLMCompletionParams, type LLMCompletionResult, type LLMProvider } from "./provider";

export class MockProvider implements LLMProvider {
  readonly name = "mock";
  readonly isAvailable = true;

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const userContent = params.messages.find((m) => m.role === "user")?.content ?? "";
    let task = "unknown";
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(userContent) as Record<string, unknown>;
      task = typeof body.task === "string" ? body.task : "unknown";
    } catch {
      // plain text prompt — leave task as "unknown"
    }
    return {
      content: MockProvider.responseForTask(task, body),
      model: "mock-v1",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  private static responseForTask(task: string, body: Record<string, unknown>): string {
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

      case "tailor_resume_rewrite_plan": {
        const facts = Array.isArray(body.resumeFacts)
          ? (body.resumeFacts as Array<{ id?: string; category?: string; text?: string }>)
          : [];
        const summary = facts.find((fact) => fact.category === "summary");
        const microservices = facts.find((fact) =>
          fact.text?.toLowerCase().includes("microservices")
        );
        return JSON.stringify({
          summary:
            "Plan de démonstration : je privilégie les preuves déjà présentes et je laisse les mots-clés non prouvés hors du CV.",
          operations: [
            summary?.id && summary.text
              ? {
                  id: "op1",
                  targetKind: "summary",
                  originalText: summary.text,
                  rewrittenText:
                    "Full-stack engineer with 6 years of experience building scalable web applications with React, Node.js, AWS cloud infrastructure, and a platform serving 2 million users.",
                  reason:
                    "Le résumé remonte les mots-clés prouvés les plus pertinents sans ajouter de nouvelle information.",
                  sourceFactIds: [summary.id],
                  matchedKeywords: [],
                }
              : null,
            microservices?.id && microservices.text
              ? {
                  id: "op2",
                  targetKind: "experience",
                  originalText: microservices.text,
                  rewrittenText:
                    "Led migration from monolith to Docker and Kubernetes microservices.",
                  reason: "La ligne rapproche les technologies prouvées du vocabulaire de l'offre.",
                  sourceFactIds: [microservices.id],
                  matchedKeywords: ["microservices"],
                }
              : null,
          ].filter(Boolean),
          skippedKeywords: [
            {
              term: "mot-clé non prouvé",
              reason: "Le mock illustre qu'un mot-clé absent du CV n'est pas ajouté.",
            },
          ],
        });
      }

      default:
        return JSON.stringify({ content: "Mock provider response" });
    }
  }
}
