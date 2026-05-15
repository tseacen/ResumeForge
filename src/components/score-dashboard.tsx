import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CompatibilityScore } from "@/lib/schemas/score.schema";

interface Props {
  score: CompatibilityScore;
}

function scoreColor(value: number) {
  if (value >= 75) return "text-green-600";
  if (value >= 50) return "text-amber-500";
  return "text-red-600";
}

const riskStyles = {
  low: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  medium: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  high: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
} as const;

const METRICS: { key: keyof Pick<CompatibilityScore, "ats" | "technicalFit" | "recruiterFit" | "seniorityFit" | "marketFit">; label: string }[] = [
  { key: "ats", label: "ATS Score" },
  { key: "technicalFit", label: "Technical Fit" },
  { key: "recruiterFit", label: "Recruiter Fit" },
  { key: "seniorityFit", label: "Seniority Fit" },
  { key: "marketFit", label: "Market Fit" },
];

export function ScoreDashboard({ score }: Props) {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Global Match Score</p>
            <p className={`mt-1 text-5xl font-bold tabular-nums ${scoreColor(score.global)}`}>
              {score.global}
              <span className="text-xl font-normal text-muted-foreground"> / 100</span>
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">Risk Level</p>
            <Badge className={`text-sm px-3 py-1 border ${riskStyles[score.riskLevel]}`}>
              {score.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-5 gap-3">
        {METRICS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-2xl font-bold tabular-nums ${scoreColor(score[key])}`}>
                {score[key]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
