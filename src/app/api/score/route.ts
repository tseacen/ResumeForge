import { NextResponse } from "next/server";
import { z } from "zod";

import { JobAnalysisSchema } from "@/lib/llm/prompts";
import { isResolutionError, resolveProvider } from "@/lib/llm/resolve-provider";
import { runScore } from "@/lib/llm/runner";
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

const BodySchema = z.object({
  resumeHtml: z.string().min(20),
  jobText: z.string().min(20),
  jobAnalysis: JobAnalysisSchema,
  answers: z.array(AnswerSchema).default([]),
  provider: AIProviderIdSchema.optional(),
  model: z.string().optional(),
  language: z.enum(["en", "fr"]).default("en"),
});

export async function POST(request: Request) {
  const endTimer = devTimer("api/score", "request total");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    devError("api/score", "invalid body", err instanceof Error ? err.message : err);
    endTimer();
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  const resolved = await resolveProvider(body.provider, body.model);
  if (isResolutionError(resolved)) {
    devError("api/score", "provider unavailable", resolved);
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
    const report = await runScore(resolved.provider, {
      resumeHtml: body.resumeHtml,
      jobText: body.jobText,
      jobAnalysis: body.jobAnalysis,
      answers: body.answers,
      language: body.language,
    });
    devLog("api/score", "report ready", { global: report.global, rows: report.rows.length });
    endTimer();
    return NextResponse.json({
      report,
      llm: {
        providerName: resolved.providerLabel,
        binary: resolved.binary,
        model: resolved.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : aiNoResponse(body.language);
    devError("api/score", "run failed", message);
    endTimer();
    return NextResponse.json({ error: "ai_call_failed", message }, { status: 502 });
  }
}
