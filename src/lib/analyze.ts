import { parseJobText } from "@/lib/parsers/parse-job-text";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { scoreCompatibility } from "@/lib/scoring/score-compatibility";
import { auditGeneratedResume } from "@/lib/tailoring/audit-generated-resume";
import { tailorResume } from "@/lib/tailoring/tailor-resume";
import { type AnalysisResponse } from "@/lib/types";

// Runs the full analysis pipeline synchronously in the calling context.
// All dependencies (cheerio, nanoid, etc.) are isomorphic and work in both
// the browser (Tauri / static export) and Node.js (API routes / SSR).
export function runAnalysis(resumeHtml: string, jobText: string): AnalysisResponse {
  const resume = parseResumeHtml(resumeHtml);
  const job = parseJobText(jobText);
  const score = scoreCompatibility(resume, job);
  const tailored = tailorResume(resume, job);
  const auditReport = auditGeneratedResume(resume, tailored.audits);
  return {
    resume,
    job,
    score,
    tailored: { html: tailored.html, audits: tailored.audits },
    auditReport,
  };
}
