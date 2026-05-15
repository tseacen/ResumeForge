import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { parseJobText } from "@/lib/parsers/parse-job-text";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { scoreCompatibility } from "@/lib/scoring/score-compatibility";
import { auditGeneratedResume } from "@/lib/tailoring/audit-generated-resume";
import { tailorResume } from "@/lib/tailoring/tailor-resume";
import { type AnalysisResponse } from "@/lib/types";

const RequestSchema = z.object({
  resumeHtml: z.string().min(1, "Resume HTML is required"),
  jobText: z.string().min(1, "Job description is required"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { resumeHtml, jobText } = parsed.data;

  const resume = parseResumeHtml(resumeHtml);
  const job = parseJobText(jobText);
  const score = scoreCompatibility(resume, job);
  const tailored = tailorResume(resume, job);
  const auditReport = auditGeneratedResume(resume, tailored.audits);

  const response: AnalysisResponse = {
    resume,
    job,
    score,
    tailored: { html: tailored.html, audits: tailored.audits },
    auditReport,
  };

  return NextResponse.json(response);
}
