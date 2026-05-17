import { type ResumeAuditReport, type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type ParsedResume } from "@/lib/schemas/resume.schema";
export function auditGeneratedResume(originalResume: ParsedResume, audits: ResumeChangeAudit[]): ResumeAuditReport {
  return { totalChanges: 0, highRiskChanges: 0, changes: [] };
}
