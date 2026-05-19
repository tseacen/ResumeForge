import { type AppLocale } from "@/lib/i18n";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { type TailoredResume } from "@/lib/schemas/tailoring.schema";
import { applyTailoringPlan } from "@/lib/tailoring/adapt-resume";

import { parseLlmJson } from "./parse-json";
import {
  ANALYZE_JOB_SYSTEM,
  buildAnalyzeJobUserPayload,
  buildScoreUserPayload,
  buildTailorResumeUserPayload,
  CompatibilityReportSchema,
  JobAnalysisSchema,
  SCORE_SYSTEM,
  TAILOR_RESUME_SYSTEM,
  TailoringPlanSchema,
  type TailoringAuditContextItem,
  type CompatibilityReport,
  type JobAnalysis,
} from "./prompts";
import { type LLMProvider } from "./provider";

export interface RunAnalyzeJobParams {
  resumeHtml: string;
  jobText: string;
  language: AppLocale;
}

export async function runAnalyzeJob(
  provider: LLMProvider,
  params: RunAnalyzeJobParams
): Promise<JobAnalysis> {
  const resume = parseResumeHtml(params.resumeHtml);
  const result = await provider.complete({
    messages: [
      { role: "system", content: ANALYZE_JOB_SYSTEM },
      {
        role: "user",
        content: buildAnalyzeJobUserPayload({
          jobText: params.jobText,
          resumeFacts: resume.facts,
          language: params.language,
        }),
      },
    ],
    temperature: 0.2,
    maxTokens: 1800,
  });
  return parseLlmJson(result.content, JobAnalysisSchema);
}

export interface RunScoreParams {
  resumeHtml: string;
  jobText: string;
  jobAnalysis: JobAnalysis;
  answers: Array<{ id: string; question: string; answer: string }>;
  language: AppLocale;
}

export async function runScore(
  provider: LLMProvider,
  params: RunScoreParams
): Promise<CompatibilityReport> {
  const resume = parseResumeHtml(params.resumeHtml);
  const result = await provider.complete({
    messages: [
      { role: "system", content: SCORE_SYSTEM },
      {
        role: "user",
        content: buildScoreUserPayload({
          jobText: params.jobText,
          resumeFacts: resume.facts,
          jobAnalysis: params.jobAnalysis,
          answers: params.answers,
          language: params.language,
        }),
      },
    ],
    temperature: 0.2,
    maxTokens: 2200,
  });
  return parseLlmJson(result.content, CompatibilityReportSchema);
}

export interface RunTailorResumeParams {
  resumeHtml: string;
  jobText: string;
  jobAnalysis: JobAnalysis;
  compatibilityReport: CompatibilityReport;
  answers: Array<{ id: string; question: string; answer: string }>;
  revisionInstructions?: string[];
  previousAudit?: TailoringAuditContextItem[];
  language: AppLocale;
}

export async function runTailorResume(
  provider: LLMProvider,
  params: RunTailorResumeParams
): Promise<TailoredResume> {
  const resume = parseResumeHtml(params.resumeHtml);
  const result = await provider.complete({
    messages: [
      { role: "system", content: TAILOR_RESUME_SYSTEM },
      {
        role: "user",
        content: buildTailorResumeUserPayload({
          jobText: params.jobText,
          resumeFacts: resume.facts,
          jobAnalysis: params.jobAnalysis,
          compatibilityReport: params.compatibilityReport,
          answers: params.answers,
          revisionInstructions: params.revisionInstructions,
          previousAudit: params.previousAudit,
          language: params.language,
        }),
      },
    ],
    temperature: 0.15,
    maxTokens: 2600,
  });

  const plan = parseLlmJson(result.content, TailoringPlanSchema);
  const safetyAnswers = [
    ...params.answers,
    ...(params.revisionInstructions ?? []).map((instruction, index) => ({
      id: `revision-${index + 1}`,
      question: "User revision instruction",
      answer: instruction,
    })),
  ];

  return applyTailoringPlan({
    originalHtml: params.resumeHtml,
    plan,
    answers: safetyAnswers,
  });
}
