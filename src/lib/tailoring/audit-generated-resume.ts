import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type ParsedResume } from "@/lib/schemas/resume.schema";

export interface AuditReport {
  /** Audit records for items intentionally excluded (would fabricate experience). */
  blockedItems: ResumeChangeAudit[];
  /** Audit records for items that need explicit user confirmation before including. */
  needsValidation: ResumeChangeAudit[];
  /** Source fact IDs referenced in audits that don't exist in the original resume. */
  orphanedSourceIds: string[];
  riskLevel: "low" | "medium" | "high";
  /** True when no blocked leaks and no orphaned source references are detected. */
  isClean: boolean;
}

export function auditGeneratedResume(
  originalResume: ParsedResume,
  audits: ResumeChangeAudit[]
): AuditReport {
  const validFactIds = new Set(originalResume.facts.map((f) => f.id));

  const blockedItems = audits.filter((a) => a.classification === "blocked");
  const needsValidation = audits.filter((a) => a.classification === "needs_user_validation");

  // Detect audit records that reference fact IDs not present in the source resume.
  // Non-empty sourceFactIds that don't resolve → potential hallucination signal.
  const orphanedSourceIds = [
    ...new Set(
      audits
        .flatMap((a) => a.sourceFactIds)
        .filter((id) => id.length > 0 && !validFactIds.has(id))
    ),
  ];

  const hasHighRisk =
    orphanedSourceIds.length > 0 || audits.some((a) => a.risk === "high" && a.classification !== "blocked");
  const hasMediumRisk =
    needsValidation.length > 0 || audits.some((a) => a.risk === "medium");

  const riskLevel: AuditReport["riskLevel"] = hasHighRisk ? "high" : hasMediumRisk ? "medium" : "low";

  // isClean: no content was fabricated (blocked items are expected, not a problem)
  const isClean = orphanedSourceIds.length === 0 && needsValidation.length === 0;

  return {
    blockedItems,
    needsValidation,
    orphanedSourceIds,
    riskLevel,
    isClean,
  };
}
