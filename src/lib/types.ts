import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type ParsedJob } from "@/lib/schemas/job.schema";
import { type ParsedResume } from "@/lib/schemas/resume.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";
import { type AuditReport } from "@/lib/tailoring/audit-generated-resume";

export interface AnalysisResponse {
  resume: ParsedResume;
  job: ParsedJob;
  score: CompatibilityScore;
  tailored: {
    html: string;
    audits: ResumeChangeAudit[];
  };
  auditReport: AuditReport;
}
