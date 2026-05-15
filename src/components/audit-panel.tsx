import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type AuditReport } from "@/lib/tailoring/audit-generated-resume";

interface Props {
  audits: ResumeChangeAudit[];
  auditReport: AuditReport;
}

type Classification = ResumeChangeAudit["classification"];
type Risk = ResumeChangeAudit["risk"];

const classificationStyles: Record<Classification, string> = {
  proven: "bg-green-100 text-green-800 hover:bg-green-100",
  rewritten: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  inferred_safe: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100",
  needs_user_validation: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  blocked: "bg-red-100 text-red-800 hover:bg-red-100",
};

const riskStyles: Record<Risk, string> = {
  low: "bg-green-100 text-green-800 hover:bg-green-100",
  medium: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  high: "bg-red-100 text-red-800 hover:bg-red-100",
};

export function AuditPanel({ audits, auditReport }: Props) {
  const blockedCount = auditReport.blockedItems.length;
  const rewrittenCount = audits.filter((a) => a.classification === "rewritten").length;
  const validationCount = auditReport.needsValidation.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          className={
            auditReport.isClean
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-amber-100 text-amber-800 hover:bg-amber-100"
          }
        >
          {auditReport.isClean ? "Clean" : "Needs Review"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {rewrittenCount} rewritten · {blockedCount} blocked · {validationCount} need validation
        </span>
      </div>

      {blockedCount > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>{blockedCount}</strong> required skill
          {blockedCount === 1 ? "" : "s"} could not be added — not evidenced in the original resume.
        </div>
      )}

      {audits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No structural changes were made.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Section</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-44">Classification</TableHead>
              <TableHead className="w-20">Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.map((audit) => (
              <TableRow key={audit.changeId}>
                <TableCell className="font-medium capitalize">{audit.targetSection}</TableCell>
                <TableCell>
                  <p className="text-sm">{audit.reason}</p>
                  {audit.originalText && (
                    <p
                      className="mt-1 max-w-md truncate text-xs text-muted-foreground"
                      title={audit.originalText}
                    >
                      Was: {audit.originalText.slice(0, 100)}
                      {audit.originalText.length > 100 ? "…" : ""}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={classificationStyles[audit.classification]}>
                    {audit.classification.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={riskStyles[audit.risk]}>{audit.risk}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
