import { type ParsedJob } from "@/lib/schemas/job.schema";
import { type ParsedResume } from "@/lib/schemas/resume.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

export function scoreCompatibility(resume: ParsedResume, job: ParsedJob): CompatibilityScore {
  return {
    global: 0,
    ats: 0,
    recruiterFit: 0,
    technicalFit: 0,
    seniorityFit: 0,
    marketFit: 0,
    riskLevel: "low",
    strengths: [],
    weaknesses: [],
    blockers: [],
    missingKeywords: [],
    interviewRisks: [],
  };
}
