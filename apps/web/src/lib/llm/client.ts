import { type AppLocale } from "@/lib/i18n";
import { type CompatibilityReport, type JobAnalysis } from "@/lib/llm/prompts";
import { type AIProviderId } from "@/lib/schemas/settings.schema";
import { type TailoredResume } from "@/lib/schemas/tailoring.schema";

import { isTauri } from "./runtime";
import { checkCliAvailableViaShell } from "./tauri-provider";

export interface AnalyzeJobInput {
  resumeHtml: string;
  jobText: string;
  provider: AIProviderId;
  model?: string;
  language?: AppLocale;
}

export interface ScoreInput {
  resumeHtml: string;
  jobText: string;
  provider: AIProviderId;
  model?: string;
  language?: AppLocale;
  jobAnalysis: JobAnalysis;
  answers: Array<{ id: string; question: string; answer: string }>;
}

export interface AdaptResumeInput {
  resumeHtml: string;
  jobText: string;
  provider: AIProviderId;
  model?: string;
  language?: AppLocale;
  jobAnalysis: JobAnalysis;
  compatibilityReport: CompatibilityReport;
  answers: Array<{ id: string; question: string; answer: string }>;
  revisionInstructions?: string[];
  previousAudit?: Array<{
    id: string;
    status: "applied" | "blocked" | "skipped";
    targetKind: "summary" | "experience" | "project" | "skill" | "other";
    originalText: string;
    rewrittenText: string;
    reason: string;
  }>;
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let message = `HTTP ${response.status}`;
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    message = payload.message ?? payload.error ?? message;
  } catch {
    const text = await response.text();
    if (text) message = text.slice(0, 400);
  }
  throw new Error(message);
}

export async function checkCli(provider: AIProviderId): Promise<boolean> {
  if (provider === "mock") return true;
  if (isTauri()) {
    const binary =
      provider === "claude-code" ? "claude" : provider === "openai-codex" ? "codex" : "gemini";
    return checkCliAvailableViaShell(binary);
  }
  try {
    const res = await fetch(`/api/check-cli?provider=${encodeURIComponent(provider)}`);
    if (!res.ok) return false;
    const data = (await res.json()) as { available: boolean };
    return data.available;
  } catch {
    return false;
  }
}

export async function analyzeJob(input: AnalyzeJobInput): Promise<JobAnalysis> {
  const res = await fetch("/api/analyze-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonOrThrow<{ analysis: JobAnalysis }>(res);
  return data.analysis;
}

export async function scoreCompatibility(input: ScoreInput): Promise<CompatibilityReport> {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonOrThrow<{ report: CompatibilityReport }>(res);
  return data.report;
}

export async function adaptResume(input: AdaptResumeInput): Promise<TailoredResume> {
  const res = await fetch("/api/adapt-cv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonOrThrow<{ tailoredResume: TailoredResume }>(res);
  return data.tailoredResume;
}
