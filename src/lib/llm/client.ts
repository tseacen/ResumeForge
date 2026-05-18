// Façade client : la couche UI appelle ces fonctions sans se soucier du mode.
// - En Tauri (window.__TAURI_INTERNALS__) : appelle plugin-shell + runner directement.
// - Sinon (dev web Next.js) : poste sur les routes /api/*.

import { type CompatibilityReport, type JobAnalysis } from "@/lib/llm/prompts";
import { type AIProviderId } from "@/lib/schemas/settings.schema";

import { runAnalyzeJob, runScore } from "./runner";
import { isTauri } from "./runtime";
import {
  checkCliAvailableViaShell,
  TauriClaudeProvider,
  TauriCodexProvider,
  TauriGeminiProvider,
} from "./tauri-provider";

export interface AnalyzeJobInput {
  resumeHtml: string;
  jobText: string;
  provider: AIProviderId;
  model?: string;
}

export interface ScoreInput {
  resumeHtml: string;
  jobText: string;
  provider: AIProviderId;
  model?: string;
  jobAnalysis: JobAnalysis;
  answers: Array<{ id: string; question: string; answer: string }>;
}

function buildTauriProvider(provider: AIProviderId, model?: string) {
  if (provider === "claude-code") return new TauriClaudeProvider(model);
  if (provider === "openai-codex") return new TauriCodexProvider(model);
  if (provider === "gemini-cli") return new TauriGeminiProvider(model);
  throw new Error(`Provider ${provider} non supporté en mode Tauri.`);
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

// ──────────────────────────────────────────────────────────────────────────────
// checkCli
// ──────────────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────────────
// analyzeJob
// ──────────────────────────────────────────────────────────────────────────────

export async function analyzeJob(input: AnalyzeJobInput): Promise<JobAnalysis> {
  if (isTauri()) {
    const provider = buildTauriProvider(input.provider, input.model);
    return runAnalyzeJob(provider, { resumeHtml: input.resumeHtml, jobText: input.jobText });
  }
  const res = await fetch("/api/analyze-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonOrThrow<{ analysis: JobAnalysis }>(res);
  return data.analysis;
}

// ──────────────────────────────────────────────────────────────────────────────
// score
// ──────────────────────────────────────────────────────────────────────────────

export async function scoreCompatibility(input: ScoreInput): Promise<CompatibilityReport> {
  if (isTauri()) {
    const provider = buildTauriProvider(input.provider, input.model);
    return runScore(provider, {
      resumeHtml: input.resumeHtml,
      jobText: input.jobText,
      jobAnalysis: input.jobAnalysis,
      answers: input.answers,
    });
  }
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonOrThrow<{ report: CompatibilityReport }>(res);
  return data.report;
}
