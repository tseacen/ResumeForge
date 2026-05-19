import { z } from "zod";

import { type ResumeFact } from "@/lib/schemas/resume.schema";
import {
  TailoringPlanSchema,
  type TailoringPlan,
} from "@/lib/schemas/tailoring.schema";

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

export { TailoringPlanSchema, type TailoringPlan };

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

export const TAILOR_RESUME_SYSTEM = [
  "You are a meticulous CV editor. You receive a raw job offer, a compatibility report, facts extracted from the candidate's master resume, and optional user-validated clarification answers.",
  "Your mission: propose a SMALL rewrite plan that adapts the existing CV to the role without recreating the CV.",
  "",
  "Critical safety rules:",
  "- NEVER invent resume facts.",
  "- Do not create companies, job titles, metrics, degrees, certifications, tools, responsibilities, seniority, or production experience that are not explicitly supported by resume facts or user clarification answers.",
  "- Do NOT output full HTML. The app will apply exact text replacements locally to preserve layout and proportions.",
  "- Each operation must target an exact `originalText` copied from one resume fact. If you cannot copy the exact text, skip the change.",
  "- Keep the same language, tone, tense, and factual level as `originalText`. Do not translate the CV.",
  "- Preserve role titles, company names, dates, education, contact details, and links.",
  "- Rewrites should be compact: ideally same length as the original, never bloated.",
  "- You may emphasize job keywords only when the underlying skill or experience is already supported.",
  "- If a keyword is missing or unsupported, list it in `skippedKeywords` instead of adding it to the CV.",
  "- Maximum 8 operations. Prefer summary and high-impact bullets over cosmetic changes.",
  "",
  "IMPORTANT — language: user-facing audit text (`summary`, `reason`, `skippedKeywords.reason`) MUST be written in French. The rewritten CV text itself MUST keep the language of the original CV text.",
  "",
  "Output: STRICT JSON, no prose, no markdown fences, no commentary.",
  "Schema:",
  JSON.stringify(
    {
      summary: "string — concise French summary of what the plan safely changes",
      operations: [
        {
          id: "short stable string, e.g. op1",
          targetKind: "'summary' | 'experience' | 'project' | 'skill' | 'other'",
          originalText: "string — exact text copied from a resume fact",
          rewrittenText: "string — compact rewrite, same language as originalText",
          reason: "string — why this safe change improves fit, in French",
          sourceFactIds: ["fact id(s) proving the rewritten text"],
          matchedKeywords: ["job keyword(s) safely reflected by this rewrite"],
        },
      ],
      skippedKeywords: [
        {
          term: "string — unsupported or unsafe keyword from the offer",
          reason: "string — why it was not added, in French",
        },
      ],
    },
    null,
    2
  ),
].join("\n");

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

export function buildTailorResumeUserPayload(params: {
  jobText: string;
  resumeFacts: ResumeFact[];
  jobAnalysis: JobAnalysis;
  compatibilityReport: CompatibilityReport;
  answers: Array<{ id: string; question: string; answer: string }>;
}): string {
  return JSON.stringify(
    {
      task: "tailor_resume_rewrite_plan",
      jobText: params.jobText,
      jobAnalysis: params.jobAnalysis,
      compatibilityReport: params.compatibilityReport,
      resumeFacts: compactFacts(params.resumeFacts),
      clarificationAnswers: params.answers,
    },
    null,
    2
  );
}
