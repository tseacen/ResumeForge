import { NextResponse } from "next/server";
import { z } from "zod";

import { translate } from "@/lib/i18n";
import { extractJobOfferUrlCandidate } from "@/lib/job-offer/input-validation";
import { JobOfferImportError, importJobOfferFromUrl } from "@/lib/job-offer/url-import";
import { devError, devLog, devTimer } from "@/lib/logger";

export const runtime = "nodejs";

const BodySchema = z.object({
  rawInput: z.string().min(5),
  language: z.enum(["en", "fr"]).default("en"),
});

export async function POST(request: Request) {
  const endTimer = devTimer("api/import-job-offer-url", "request total");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    devError(
      "api/import-job-offer-url",
      "invalid body",
      err instanceof Error ? err.message : err
    );
    endTimer();
    return NextResponse.json(
      { error: "invalid_body", message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  const urlCandidate = extractJobOfferUrlCandidate(body.rawInput);
  if (!urlCandidate) {
    endTimer();
    return NextResponse.json(
      {
        error: "invalid_url_input",
        message: translate(body.language, "app.jobOfferUrlInvalid"),
      },
      { status: 422 }
    );
  }

  try {
    const imported = await importJobOfferFromUrl(urlCandidate);
    devLog("api/import-job-offer-url", "import success", {
      source: imported.source,
      sourceHost: imported.sourceHost,
      chars: imported.jobText.length,
    });
    endTimer();
    return NextResponse.json({
      imported,
    });
  } catch (err) {
    const baseMessage = translate(body.language, "app.jobOfferUrlImportFailed");
    const details = err instanceof Error ? err.message : String(err);
    devError("api/import-job-offer-url", "import failed", details);
    endTimer();
    const isImportError = err instanceof JobOfferImportError;
    return NextResponse.json(
      {
        error: isImportError ? "url_import_failed" : "url_import_error",
        message: `${baseMessage} (${details})`,
      },
      { status: 502 }
    );
  }
}
