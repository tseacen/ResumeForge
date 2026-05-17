// TODO: Repartir de zéro pour la logique d'analyse et d'orchestration
import { parseJobText } from "@/lib/parsers/parse-job-text";
import { parseResumeHtml } from "@/lib/parsers/parse-resume-html";
import { scoreCompatibility } from "@/lib/scoring/score-compatibility";
import { type AnalysisResponse } from "@/lib/types";

export function runAnalysis(resumeHtml: string, jobText: string): AnalysisResponse {
  const resume = parseResumeHtml(resumeHtml); // Gardons juste le parser HTML du CV pour l'instant
  const job = parseJobText(jobText);
  const score = scoreCompatibility(resume, job);
  
  return {
    resume,
    job,
    score,
    tailored: { html: resumeHtml, audits: [] }, // Renvoie le CV tel quel pour l'instant
    auditReport: { totalChanges: 0, highRiskChanges: 0, changes: [] },
  };
}
