import { z } from "zod";

import { type ResumeFact } from "@/lib/schemas/resume.schema";

// ──────────────────────────────────────────────────────────────────────────────
// JOB ANALYSIS — étape 1
// L'IA reçoit le texte du poste + les facts du CV maître.
// Elle retourne : un résumé du poste + une liste de questions de clarification
// (peut être vide si aucune confusion).
// ──────────────────────────────────────────────────────────────────────────────

export const ClarificationSchema = z.object({
  id: z.string(),
  label: z.string(),
  question: z.string(),
  context: z.string(),
  responseMode: z.enum(["single", "multiple"]).default("single"),
  suggestedAnswers: z.array(z.string()).default([]),
});

export const JobAnalysisSchema = z.object({
  jobTitle: z.string(),
  company: z.string().nullable().default(null),
  summary: z.string(),
  clarifications: z.array(ClarificationSchema).default([]),
});

export type Clarification = z.infer<typeof ClarificationSchema>;
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY SCORE — étape 2
// L'IA reçoit job + résumé + facts + réponses aux clarifications.
// Elle retourne un objet de scoring complet pour alimenter le tableau.
// ──────────────────────────────────────────────────────────────────────────────

export const ScoreRowSchema = z.object({
  label: z.string(),
  value: z.number().min(0).max(100),
  rationale: z.string(),
});

export const ScoreNeedSchema = z.object({
  term: z.string(),
  level: z.enum(["required", "preferred", "bonus"]),
  reason: z.string().optional(),
});

export const CompatibilityReportSchema = z.object({
  global: z.number().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high"]),
  rows: z.array(ScoreRowSchema).min(3),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  missingKeywords: z.array(ScoreNeedSchema).default([]),
  interviewRisks: z.array(z.string()).default([]),
  verdict: z.string(),
});

export type CompatibilityReport = z.infer<typeof CompatibilityReportSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ──────────────────────────────────────────────────────────────────────────────

export const ANALYZE_JOB_SYSTEM = [
  "You are a senior recruiting analyst. You receive (1) a raw job offer and (2) facts extracted from the candidate's master resume.",
  "Your mission: understand the role and identify ONLY the genuine clarifications needed before scoring compatibility.",
  "",
  "Strict rules:",
  "- NEVER ask cosmetic or filler questions.",
  "- A question is legitimate ONLY if it resolves an ambiguity that materially affects scoring (e.g. a technology mentioned in the offer that is absent from the resume but may actually be known; unclear seniority; mobility/location; domain specialty).",
  "- Maximum 4 questions. Return an empty array if nothing is ambiguous.",
  "- Each question must be concrete, short, and carry a `context` field explaining WHY you ask.",
  "- Provide 2 to 4 relevant suggested answers.",
  "- Set `responseMode` to `single` when one answer is expected, and `multiple` when several answers may apply.",
  "",
  "IMPORTANT — language: all USER-FACING text (jobTitle, company, summary, label, question, context, suggestedAnswers) MUST be written in French. Only the JSON keys stay in English (they are the schema).",
  "",
  "Output: STRICT JSON, no prose, no markdown fences, no commentary.",
  "Schema:",
  JSON.stringify(
    {
      jobTitle: "string — detected job title (in French)",
      company: "string | null — company if identifiable (in French)",
      summary: "string — 1 to 2 sentences summarizing the role and stakes (in French)",
      clarifications: [
        {
          id: "short string (e.g. q1)",
          label: "short string (e.g. Stack technique) (in French)",
          question: "string — direct question for the candidate (in French)",
          context: "string — why you are asking (in French)",
          responseMode: "'single' | 'multiple'",
          suggestedAnswers: ["string (in French)", "..."],
        },
      ],
    },
    null,
    2
  ),
].join("\n");

export const SCORE_SYSTEM = [
  "You are a senior recruiting analyst. You receive (1) the job offer, (2) the previous analysis summary, (3) the master resume facts, (4) the candidate's answers to the clarification questions.",
  "Your mission: produce an honest, actionable compatibility report.",
  "",
  "Strict rules:",
  "- `global` is a 0–100 score. Be demanding: 70+ = real strong fit, 50–69 = acceptable fit with gaps, <50 = significant mismatch.",
  "- At least 3 rows, ideally 5: e.g. Technical skills, Experience relevance, ATS keywords, Seniority, Market/domain.",
  "- List real strengths (observed in the resume), weaknesses, and blockers.",
  "- `missingKeywords`: keywords present in the offer but absent from the resume, classified by level (required/preferred/bonus).",
  "- `interviewRisks`: topics the candidate will likely be challenged on during an interview.",
  "- `verdict`: 1 to 2 honest sentences, recruiter tone.",
  "- Use the clarification answers to adjust scoring (e.g. if the candidate confirmed they used X, do not count it as missing).",
  "- Invent nothing. If the resume does not prove a skill and the user did not validate it, treat it as missing.",
  "",
  "IMPORTANT — language: all USER-FACING text (verdict, row labels and rationales, strengths, weaknesses, blockers, missingKeywords.reason, interviewRisks) MUST be written in French. Only JSON keys and enum values (low/medium/high, required/preferred/bonus) stay in English.",
  "",
  "Output: STRICT JSON, no prose, no markdown fences, no commentary.",
  "Schema:",
  JSON.stringify(
    {
      global: "number 0-100",
      riskLevel: "'low' | 'medium' | 'high'",
      rows: [
        {
          label: "string — row name (in French)",
          value: "number 0-100",
          rationale: "string — short justification (in French)",
        },
      ],
      strengths: ["string (in French)"],
      weaknesses: ["string (in French)"],
      blockers: ["string (in French)"],
      missingKeywords: [
        {
          term: "string — keyword as it appears in the offer (keep original casing)",
          level: "'required' | 'preferred' | 'bonus'",
          reason: "optional string (in French)",
        },
      ],
      interviewRisks: ["string (in French)"],
      verdict: "string — 1-2 synthesis sentences (in French)",
    },
    null,
    2
  ),
].join("\n");

// ──────────────────────────────────────────────────────────────────────────────
// USER MESSAGE BUILDERS
// ──────────────────────────────────────────────────────────────────────────────

function compactFacts(facts: ResumeFact[]): Array<{ id: string; category: string; text: string }> {
  return facts.slice(0, 80).map((f) => ({
    id: f.id,
    category: f.category,
    text: f.text,
  }));
}

export function buildAnalyzeJobUserPayload(params: {
  jobText: string;
  resumeFacts: ResumeFact[];
}): string {
  return JSON.stringify(
    {
      task: "analyze_job_and_detect_clarifications",
      jobText: params.jobText,
      resumeFacts: compactFacts(params.resumeFacts),
    },
    null,
    2
  );
}

export function buildScoreUserPayload(params: {
  jobText: string;
  resumeFacts: ResumeFact[];
  jobAnalysis: JobAnalysis;
  answers: Array<{ id: string; question: string; answer: string }>;
}): string {
  return JSON.stringify(
    {
      task: "score_compatibility",
      jobText: params.jobText,
      jobAnalysis: params.jobAnalysis,
      resumeFacts: compactFacts(params.resumeFacts),
      clarificationAnswers: params.answers,
    },
    null,
    2
  );
}
