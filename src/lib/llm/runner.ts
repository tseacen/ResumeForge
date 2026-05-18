// Logique métier "pure" : prend un LLMProvider + les entrées brutes, retourne
// un résultat typé. Sans transport HTTP, sans dépendance à Next runtime.
// Utilisé à la fois par les routes /api/* (mode web/dev) et par le client Tauri.

import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";

import { parseLlmJson } from "./parse-json";
import {
  ANALYZE_JOB_SYSTEM,
  buildAnalyzeJobUserPayload,
  buildScoreUserPayload,
  CompatibilityReportSchema,
  JobAnalysisSchema,
  SCORE_SYSTEM,
  type CompatibilityReport,
  type JobAnalysis,
} from "./prompts";
import { type LLMProvider } from "./provider";

export interface RunAnalyzeJobParams {
  resumeHtml: string;
  jobText: string;
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
        }),
      },
    ],
    temperature: 0.2,
    maxTokens: 2200,
  });
  return parseLlmJson(result.content, CompatibilityReportSchema);
}
