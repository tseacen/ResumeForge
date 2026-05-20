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
    const isFrench = body.outputLanguage === "French";

    switch (task) {
      case "analyze_job_and_detect_clarifications":
        return JSON.stringify({
          jobTitle: isFrench ? "Poste détecté" : "Detected role",
          company: null,
          summary: isFrench
            ? "Analyse de démonstration basée uniquement sur les éléments fournis dans le CV."
            : "Demo analysis based only on the facts provided in the resume.",
          clarifications: [],
        });

      case "score_compatibility":
        return JSON.stringify({
          global: 72,
          riskLevel: "medium",
          rows: [
            {
              label: isFrench ? "Compétences techniques" : "Technical skills",
              value: 78,
              rationale: isFrench
                ? "Plusieurs compétences attendues sont déjà prouvées dans le CV."
                : "Several expected skills are already supported by the resume.",
            },
            {
              label: isFrench ? "Pertinence de l'expérience" : "Experience relevance",
              value: 70,
              rationale: isFrench
                ? "L'expérience est cohérente, avec quelques écarts à clarifier."
                : "The experience is relevant, with a few gaps to clarify.",
            },
            {
              label: isFrench ? "Mots-clés ATS" : "ATS keywords",
              value: 68,
              rationale: isFrench
                ? "Certains mots-clés importants ne sont pas explicitement présents."
                : "Some important keywords are not explicitly present.",
            },
          ],
          strengths: [isFrench ? "Expérience cohérente et prouvée." : "Relevant and supported experience."],
          weaknesses: [isFrench ? "Quelques mots-clés restent absents." : "A few keywords remain absent."],
          blockers: [],
          missingKeywords: [],
          interviewRisks: [
            isFrench ? "Préparer des exemples concrets sur les écarts." : "Prepare concrete examples for the gaps.",
          ],
          verdict: isFrench
            ? "Profil compatible avec quelques points à renforcer avant candidature."
            : "Compatible profile with a few points to strengthen before applying.",
        });

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
            isFrench
              ? "Plan de démonstration : je privilégie les preuves déjà présentes et je laisse les mots-clés non prouvés hors du CV."
              : "Demo plan: I prioritize facts already present and leave unsupported keywords out of the CV.",
          operations: [
            summary?.id && summary.text
              ? {
                  id: "op1",
                  targetKind: "summary",
                  originalText: summary.text,
                  rewrittenText:
                    "Full-stack engineer with 6 years of experience building scalable web applications with React, Node.js, AWS cloud infrastructure, and a platform serving 2 million users.",
                  reason: isFrench
                    ? "Le résumé remonte les mots-clés prouvés les plus pertinents sans ajouter de nouvelle information."
                    : "The summary surfaces the most relevant supported keywords without adding new information.",
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
                  reason: isFrench
                    ? "La ligne rapproche les technologies prouvées du vocabulaire de l'offre."
                    : "The line brings supported technologies closer to the job offer wording.",
                  sourceFactIds: [microservices.id],
                  matchedKeywords: ["microservices"],
                }
              : null,
          ].filter(Boolean),
          skippedKeywords: [
            {
              term: isFrench ? "mot-clé non prouvé" : "unsupported keyword",
              reason: isFrench
                ? "Le mock illustre qu'un mot-clé absent du CV n'est pas ajouté."
                : "The mock illustrates that a keyword absent from the CV is not added.",
            },
          ],
        });
      }

      default:
        return JSON.stringify({ content: "Mock provider response" });
    }
  }
}
