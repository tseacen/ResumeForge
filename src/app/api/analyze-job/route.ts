import { NextResponse } from "next/server";
import { z } from "zod";

import { translate } from "@/lib/i18n";
import { extractJobOfferUrlCandidate } from "@/lib/job-offer/input-validation";
import { importJobOfferFromUrl, JobOfferImportError } from "@/lib/job-offer/url-import";
import { isResolutionError, resolveProvider } from "@/lib/llm/resolve-provider";
import { runAnalyzeJob } from "@/lib/llm/runner";
import { devError, devLog, devTimer } from "@/lib/logger";
import { AIProviderIdSchema } from "@/lib/schemas/settings.schema";

export const runtime = "nodejs";

function aiNoResponse(language: "en" | "fr"): string {
  return language === "fr" ? "L'IA n'a pas répondu." : "The AI did not respond.";
}

const BodySchema = z.object({
  resumeHtml: z.string().min(20),
  jobText: z.string().min(20),
  provider: AIProviderIdSchema.optional(),
  model: z.string().optional(),
  language: z.enum(["en", "fr"]).default("en"),
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

  let resolvedJobText = body.jobText;
  const urlCandidate = extractJobOfferUrlCandidate(body.jobText);
  if (urlCandidate) {
    try {
      const imported = await importJobOfferFromUrl(urlCandidate);
      resolvedJobText = imported.jobText;
      devLog("api/analyze-job", "job text imported from URL", {
        source: imported.source,
        sourceHost: imported.sourceHost,
        chars: imported.jobText.length,
      });
    } catch (err) {
      const details = err instanceof Error ? err.message : String(err);
      const message = `${translate(body.language, "app.jobOfferUrlImportFailed")} (${details})`;
      devError("api/analyze-job", "job URL import failed", {
        error: details,
        type: err instanceof JobOfferImportError ? "import" : "unknown",
      });
      endTimer();
      return NextResponse.json(
        { error: "url_import_failed", message },
        { status: 502 }
      );
    }
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
      jobText: resolvedJobText,
      language: body.language,
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
    const message = err instanceof Error ? err.message : aiNoResponse(body.language);
    devError("api/analyze-job", "run failed", message);
    endTimer();
    return NextResponse.json(
      { error: "ai_call_failed", message },
      { status: 502 }
    );
  }
}
