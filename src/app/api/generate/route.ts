import { execFile } from "child_process";
import { promisify } from "util";

import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";

import { runAnalysis } from "@/lib/analyze";
import { ClaudeCliProvider, CodexCliProvider } from "@/lib/llm/cli-provider";
import { enhanceSummary, proposeRewrites, type LLMProvider } from "@/lib/llm/provider";
import { devError, devLog, devTimer, devWarn } from "@/lib/logger";
import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type ResumeFact } from "@/lib/schemas/resume.schema";
import { AIProviderIdSchema } from "@/lib/schemas/settings.schema";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const BodySchema = z.object({
  resumeHtml: z.string().min(20),
  jobText: z.string().min(20),
  provider: AIProviderIdSchema.optional(),
  model: z.string().optional(),
});

type ProviderId = z.infer<typeof AIProviderIdSchema>;

const CLI_BINARY: Partial<Record<ProviderId, string>> = {
  "claude-code": "claude",
  "openai-codex": "codex",
};

async function locateBinary(binary: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [binary]);
    const trimmed = stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

interface ResolvedProvider {
  provider: LLMProvider;
  binary: string;
  binaryPath: string;
  model?: string;
}

async function resolveProvider(
  providerId: ProviderId | undefined,
  model: string | undefined
): Promise<ResolvedProvider | { error: string; binary: string }> {
  if (!providerId || providerId === "mock") {
    return { error: "no_provider_selected", binary: "" };
  }
  const binary = CLI_BINARY[providerId];
  if (!binary) {
    return { error: "unsupported_provider", binary: "" };
  }
  const binaryPath = await locateBinary(binary);
  if (!binaryPath) {
    return { error: "cli_not_installed", binary };
  }
  const provider =
    providerId === "claude-code" ? new ClaudeCliProvider(model) : new CodexCliProvider(model);
  return { provider, binary, binaryPath, model };
}

function findBulletFacts(facts: ResumeFact[]): ResumeFact[] {
  return facts.filter(
    (f) =>
      f.category === "experience" &&
      (f.text.length >= 50 ||
        /^(led|built|designed|developed|implemented|managed|created|improved|reduced|increased|migrated|shipped|worked|collaborated|mentored|established|launched|optimized|delivered|architected|automated|integrated|scaled)/i.test(
          f.text
        ))
  );
}

function replaceFirst(haystack: string, needle: string, replacement: string): string {
  const idx = haystack.indexOf(needle);
  if (idx === -1) return haystack;
  return haystack.slice(0, idx) + replacement + haystack.slice(idx + needle.length);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const endTimer = devTimer("api/generate", "request total");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    devError("api/generate", "invalid body", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Invalid body", details: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  devLog("api/generate", "request received", {
    provider: body.provider,
    model: body.model,
    resumeChars: body.resumeHtml.length,
    jobChars: body.jobText.length,
  });

  // Resolve the AI provider FIRST. If nothing is configured, refuse to generate —
  // do not fall back to a deterministic-only "fake" diagnostic.
  const resolved = await resolveProvider(body.provider, body.model);
  if ("error" in resolved) {
    const reason = resolved.error;
    const message =
      reason === "cli_not_installed"
        ? `Le CLI '${resolved.binary}' est introuvable. Installez-le et reconnectez-vous, puis réessayez.`
        : reason === "no_provider_selected"
          ? "Aucun moteur d'IA sélectionné. Configurez Claude Code ou OpenAI Codex dans Réglages."
          : "Moteur d'IA non supporté.";
    devWarn("api/generate", "refusing to generate — no provider available", {
      reason,
      binary: resolved.binary,
    });
    endTimer();
    return NextResponse.json(
      { error: "ai_unavailable", reason, binary: resolved.binary, message },
      { status: 503 }
    );
  }

  devLog("api/generate", "provider resolved", {
    provider: body.provider,
    binary: resolved.binary,
    binaryPath: resolved.binaryPath,
    model: resolved.model,
  });

  // Deterministic pipeline — produces the baseline tailored HTML + audits.
  // This runs only AFTER we know we have a real AI to invoke.
  const endBaseline = devTimer("api/generate", "deterministic pipeline");
  const baseline = runAnalysis(body.resumeHtml, body.jobText);
  endBaseline();
  devLog("api/generate", "baseline computed", {
    facts: baseline.resume.facts.length,
    requirements: baseline.job.requirements.length,
    globalScore: baseline.score.global,
    baselineAudits: baseline.tailored.audits.length,
  });

  const llmAudits: ResumeChangeAudit[] = [];
  const llmErrors: string[] = [];
  let tailoredHtml = baseline.tailored.html;
  let llmModel: string | undefined = resolved.model;

  // 2) Enhance summary (preserves existing facts only)
  const summaryFacts = baseline.resume.facts.filter((f) => f.category === "summary");
  const firstSummaryFact = summaryFacts[0];
  if (firstSummaryFact) {
    const endEnhance = devTimer("api/generate", "LLM enhanceSummary");
    try {
      const matchedKeywords = baseline.score.strengths.slice(0, 10);
      const enhanced = await enhanceSummary(resolved.provider, {
        currentSummary: summaryFacts.map((f) => f.text).join(" "),
        matchedKeywords,
        jobTitle: baseline.job.title,
        resumeFacts: baseline.resume.facts,
      });
      endEnhance();

      const oldSummaryHtml = `<p>${escapeHtml(firstSummaryFact.text)}</p>`;
      const newSummaryHtml = `<p>${escapeHtml(enhanced.summary)}</p>`;
      const next = replaceFirst(tailoredHtml, oldSummaryHtml, newSummaryHtml);
      if (next !== tailoredHtml) {
        tailoredHtml = next;
        llmAudits.push({
          changeId: nanoid(10),
          targetSection: "summary",
          originalText: firstSummaryFact.text,
          newText: enhanced.summary,
          reason: "LLM-enhanced summary (no new facts introduced)",
          classification: enhanced.classification,
          sourceFactIds: enhanced.sourceFactIds,
          risk: enhanced.classification === "rewritten" ? "low" : "medium",
        });
        devLog("api/generate", "summary rewritten by LLM", {
          classification: enhanced.classification,
          from: firstSummaryFact.text.slice(0, 80),
          to: enhanced.summary.slice(0, 80),
        });
      } else {
        devWarn("api/generate", "summary replacement skipped — anchor not found in baseline HTML");
      }
    } catch (err) {
      endEnhance();
      const msg = err instanceof Error ? err.message : String(err);
      devError("api/generate", "enhanceSummary failed", msg);
      llmErrors.push(`enhanceSummary: ${msg}`);
    }
  }

  // 3) Propose rewrites for the top-N most relevant bullets
  const bulletFacts = findBulletFacts(baseline.resume.facts).slice(0, 6);
  if (bulletFacts.length > 0) {
    const endRewrites = devTimer("api/generate", "LLM proposeRewrites");
    try {
      const rewrites = await proposeRewrites(resolved.provider, {
        bullets: bulletFacts.map((f) => ({ id: f.id, text: f.text })),
        jobTitle: baseline.job.title,
        matchedKeywords: baseline.score.strengths.slice(0, 10),
      });
      endRewrites();
      devLog("api/generate", "LLM proposed rewrites", {
        requested: bulletFacts.length,
        returned: rewrites.rewrites.length,
      });

      let applied = 0;
      for (const rewrite of rewrites.rewrites) {
        const originalLi = `<li>${escapeHtml(rewrite.originalText)}</li>`;
        const newLi = `<li>${escapeHtml(rewrite.newText)}</li>`;
        const next = replaceFirst(tailoredHtml, originalLi, newLi);
        if (next === tailoredHtml) continue;
        tailoredHtml = next;
        applied += 1;
        llmAudits.push({
          changeId: nanoid(10),
          targetSection: "experience",
          originalText: rewrite.originalText,
          newText: rewrite.newText,
          reason: rewrite.reason,
          classification: rewrite.classification,
          sourceFactIds: [rewrite.sourceId],
          risk:
            rewrite.classification === "rewritten"
              ? "low"
              : rewrite.classification === "inferred_safe"
                ? "medium"
                : "high",
        });
      }
      devLog("api/generate", "rewrites applied", {
        applied,
        discarded: rewrites.rewrites.length - applied,
      });
    } catch (err) {
      endRewrites();
      const msg = err instanceof Error ? err.message : String(err);
      devError("api/generate", "proposeRewrites failed", msg);
      llmErrors.push(`proposeRewrites: ${msg}`);
    }
  }

  llmModel = llmModel ?? resolved.model;
  const used = llmErrors.length === 0 && llmAudits.length > 0;
  devLog("api/generate", "response ready", {
    llmUsed: used,
    llmAudits: llmAudits.length,
    totalAudits: baseline.tailored.audits.length + llmAudits.length,
    errors: llmErrors.length,
  });
  endTimer();

  return NextResponse.json({
    resume: baseline.resume,
    job: baseline.job,
    score: baseline.score,
    tailored: {
      html: tailoredHtml,
      audits: [...baseline.tailored.audits, ...llmAudits],
    },
    auditReport: baseline.auditReport,
    llm: {
      used,
      providerName: resolved.provider.name,
      binary: resolved.binary,
      binaryPath: resolved.binaryPath,
      model: llmModel,
      errors: llmErrors,
    },
  });
}
