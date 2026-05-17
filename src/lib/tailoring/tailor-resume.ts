import { type ParsedJob } from "@/lib/schemas/job.schema";
import { type ParsedResume } from "@/lib/schemas/resume.schema";
import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
export function tailorResume(resume: ParsedResume, job: ParsedJob): { html: string; audits: ResumeChangeAudit[] } {
  return { html: "<div class=\"document\">En attente de la nouvelle logique IA...</div>", audits: [] };
}
