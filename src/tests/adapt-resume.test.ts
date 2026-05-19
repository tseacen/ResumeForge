import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { applyTailoringPlan } from "@/lib/tailoring/adapt-resume";

const SAMPLE_HTML = fs.readFileSync(
  path.resolve(__dirname, "fixtures/sample-resume.html"),
  "utf-8"
);

function factByText(text: string) {
  const fact = parseResumeHtml(SAMPLE_HTML).facts.find((item) => item.text.includes(text));
  if (!fact) throw new Error(`Missing fixture fact: ${text}`);
  return fact;
}

describe("applyTailoringPlan", () => {
  it("applies safe exact-text rewrites to the original HTML", () => {
    const summary = factByText("Full-stack engineer");
    const result = applyTailoringPlan({
      originalHtml: SAMPLE_HTML,
      plan: {
        summary: "Réécriture sûre du résumé.",
        operations: [
          {
            id: "op-summary",
            targetKind: "summary",
            originalText: summary.text,
            rewrittenText:
              "Full-stack engineer with 6 years of experience building scalable web applications with React, Node.js, AWS cloud infrastructure, and a platform serving 2 million users.",
            reason: "Remonte les preuves les plus pertinentes pour l'offre.",
            sourceFactIds: [summary.id],
            matchedKeywords: ["React", "Node.js", "AWS"],
          },
        ],
        skippedKeywords: [],
      },
    });

    expect(result.audit[0].status).toBe("applied");
    expect(result.adaptedHtml).toContain("data-rf-change-id=\"op-summary\"");
    expect(result.adaptedHtml).toContain("Jane Doe");
    expect(result.adaptedHtml).toContain("React, Node.js, AWS cloud infrastructure");
  });

  it("blocks unsupported skills instead of adding them to the CV", () => {
    const apiBullet = factByText("Built REST APIs");
    const result = applyTailoringPlan({
      originalHtml: SAMPLE_HTML,
      plan: {
        summary: "Tentative risquée bloquée.",
        operations: [
          {
            id: "op-graphql",
            targetKind: "experience",
            originalText: apiBullet.text,
            rewrittenText: "Built REST and GraphQL APIs in Node.js serving 500k requests per day.",
            reason: "GraphQL apparaît dans l'offre.",
            sourceFactIds: [apiBullet.id],
            matchedKeywords: ["GraphQL"],
          },
        ],
        skippedKeywords: [],
      },
    });

    expect(result.audit[0].status).toBe("blocked");
    expect(result.audit[0].validationNotes.join(" ")).toContain("graphql");
    expect(result.adaptedHtml).not.toContain("GraphQL APIs");
  });

  it("allows a new keyword only when explicitly validated by the user", () => {
    const apiBullet = factByText("Built REST APIs");
    const result = applyTailoringPlan({
      originalHtml: SAMPLE_HTML,
      answers: [{ id: "q1", question: "Avez-vous utilisé GraphQL ?", answer: "GraphQL" }],
      plan: {
        summary: "Mot-clé validé par l'utilisateur.",
        operations: [
          {
            id: "op-validated-graphql",
            targetKind: "experience",
            originalText: apiBullet.text,
            rewrittenText: "Built REST and GraphQL APIs in Node.js serving 500k requests per day.",
            reason: "GraphQL a été explicitement validé par l'utilisateur.",
            sourceFactIds: [apiBullet.id],
            matchedKeywords: ["GraphQL"],
          },
        ],
        skippedKeywords: [],
      },
    });

    expect(result.audit[0].status).toBe("applied");
    expect(result.adaptedHtml).toContain("GraphQL APIs");
  });

  it("blocks rewrites that would break CV proportions", () => {
    const skill = factByText("TypeScript");
    const result = applyTailoringPlan({
      originalHtml: SAMPLE_HTML,
      plan: {
        summary: "Réécriture trop longue bloquée.",
        operations: [
          {
            id: "op-too-long",
            targetKind: "skill",
            originalText: skill.text,
            rewrittenText: Array.from({ length: 40 }, () => "TypeScript").join(" "),
            reason: "Tente d'étirer une ligne courte.",
            sourceFactIds: [skill.id],
            matchedKeywords: ["TypeScript"],
          },
        ],
        skippedKeywords: [],
      },
    });

    expect(result.audit[0].status).toBe("blocked");
    expect(result.audit[0].validationNotes.join(" ")).toContain("proportions");
  });
});
