import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { type ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { type ParsedJob } from "@/lib/schemas/job.schema";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

interface Props {
  score: CompatibilityScore;
  job: ParsedJob;
}

function ItemList({
  title,
  items,
  icon,
  emptyMessage,
  itemClass,
}: {
  title: string;
  items: string[];
  icon: ReactNode;
  emptyMessage: string;
  itemClass: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className={`flex items-start gap-2 text-sm ${itemClass}`}>
              <span className="mt-0.5 flex-shrink-0">{icon}</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReportTab({ score, job }: Props) {
  const jobLine = [job.title, job.company].filter(Boolean).join(" at ");

  return (
    <div className="space-y-6">
      {jobLine && <p className="text-sm text-muted-foreground">{jobLine}</p>}

      <div className="grid grid-cols-2 gap-6">
        <ItemList
          title="Strengths"
          items={score.strengths}
          icon={<CheckCircle size={14} className="text-green-600" />}
          emptyMessage="No required requirements matched."
          itemClass="text-green-800"
        />
        <ItemList
          title="Weaknesses"
          items={score.weaknesses}
          icon={<AlertTriangle size={14} className="text-amber-500" />}
          emptyMessage="All preferred requirements are covered."
          itemClass="text-amber-800"
        />
      </div>

      {score.blockers.length > 0 && (
        <>
          <Separator />
          <ItemList
            title="Blockers — required qualifications not evidenced"
            items={score.blockers}
            icon={<XCircle size={14} className="text-red-600" />}
            emptyMessage=""
            itemClass="text-red-800"
          />
        </>
      )}

      {score.interviewRisks.length > 0 && (
        <>
          <Separator />
          <ItemList
            title="Interview Risks"
            items={score.interviewRisks}
            icon={<AlertCircle size={14} className="text-orange-600" />}
            emptyMessage=""
            itemClass="text-orange-800"
          />
        </>
      )}
    </div>
  );
}
