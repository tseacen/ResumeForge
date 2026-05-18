import { NextResponse } from "next/server";
import { z } from "zod";

import { isResolutionError, resolveProvider } from "@/lib/llm/resolve-provider";
import { runAnalyzeJob } from "@/lib/llm/runner";
import { devError, devLog, devTimer } from "@/lib/logger";
import { AIProviderIdSchema } from "@/lib/schemas/settings.schema";

export const runtime = "nodejs";

const BodySchema = z.object({
  resumeHtml: z.string().min(20),
  jobText: z.string().min(20),
  provider: AIProviderIdSchema.optional(),
  model: z.string().optional(),
});

export async function POST(request: Request) {
  const endTimer = devTimer("api/analyze-job", "request total");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    devError("api/analyze-job", "invalid body", err instanceof Error ? err.message : err);
    endTimer();
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  const resolved = await resolveProvider(body.provider, body.model);
  if (isResolutionError(resolved)) {
    devError("api/analyze-job", "provider unavailable", resolved);
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
    const analysis = await runAnalyzeJob(resolved.provider, {
      resumeHtml: body.resumeHtml,
      jobText: body.jobText,
    });
    devLog("api/analyze-job", "analysis ready", {
      jobTitle: analysis.jobTitle,
      clarifications: analysis.clarifications.length,
    });
    endTimer();
    return NextResponse.json({
      analysis,
      llm: {
        providerName: resolved.providerLabel,
        binary: resolved.binary,
        model: resolved.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "L'IA n'a pas répondu.";
    devError("api/analyze-job", "run failed", message);
    endTimer();
    return NextResponse.json(
      { error: "ai_call_failed", message },
      { status: 502 }
    );
  }
}
