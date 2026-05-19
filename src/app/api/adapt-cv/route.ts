import { NextResponse } from "next/server";
import { z } from "zod";

import { CompatibilityReportSchema, JobAnalysisSchema } from "@/lib/llm/prompts";
import { isResolutionError, resolveProvider } from "@/lib/llm/resolve-provider";
import { runTailorResume } from "@/lib/llm/runner";
import { devError, devLog, devTimer } from "@/lib/logger";
import { AIProviderIdSchema } from "@/lib/schemas/settings.schema";

export const runtime = "nodejs";

function aiNoResponse(language: "en" | "fr"): string {
  return language === "fr" ? "L'IA n'a pas répondu." : "The AI did not respond.";
}

const AnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

const PreviousAuditItemSchema = z.object({
  id: z.string(),
  status: z.enum(["applied", "blocked", "skipped"]),
  targetKind: z.enum(["summary", "experience", "project", "skill", "other"]),
  originalText: z.string(),
  rewrittenText: z.string(),
  reason: z.string(),
});

const BodySchema = z.object({
  resumeHtml: z.string().min(20),
  jobText: z.string().min(20),
  jobAnalysis: JobAnalysisSchema,
  compatibilityReport: CompatibilityReportSchema,
  answers: z.array(AnswerSchema).default([]),
  revisionInstructions: z.array(z.string().min(2)).max(20).default([]),
  previousAudit: z.array(PreviousAuditItemSchema).max(60).default([]),
  provider: AIProviderIdSchema.optional(),
  model: z.string().optional(),
  language: z.enum(["en", "fr"]).default("en"),
});

export async function POST(request: Request) {
  const endTimer = devTimer("api/adapt-cv", "request total");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    devError("api/adapt-cv", "invalid body", err instanceof Error ? err.message : err);
    endTimer();
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  const resolved = await resolveProvider(body.provider, body.model);
  if (isResolutionError(resolved)) {
    devError("api/adapt-cv", "provider unavailable", resolved);
    endTimer();
    return NextResponse.json(
      {
        error: "ai_unavailable",
        reason: resolved.error,
        binary: resolved.binary,
        message: resolved.message,
      },
      { status: 503 }
    );
  }

  try {
    const tailoredResume = await runTailorResume(resolved.provider, {
      resumeHtml: body.resumeHtml,
      jobText: body.jobText,
      jobAnalysis: body.jobAnalysis,
      compatibilityReport: body.compatibilityReport,
      answers: body.answers,
      revisionInstructions: body.revisionInstructions,
      previousAudit: body.previousAudit,
      language: body.language,
    });
    devLog("api/adapt-cv", "tailored CV ready", {
      applied: tailoredResume.audit.filter((item) => item.status === "applied").length,
      blocked: tailoredResume.audit.filter((item) => item.status === "blocked").length,
    });
    endTimer();
    return NextResponse.json({
      tailoredResume,
      llm: {
        providerName: resolved.providerLabel,
        binary: resolved.binary,
        model: resolved.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : aiNoResponse(body.language);
    devError("api/adapt-cv", "run failed", message);
    endTimer();
    return NextResponse.json({ error: "ai_call_failed", message }, { status: 502 });
  }
}
