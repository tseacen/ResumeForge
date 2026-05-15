import { Badge } from "@/components/ui/badge";

interface Props {
  missingKeywords: string[];
}

export function MissingKeywords({ missingKeywords }: Props) {
  if (missingKeywords.length === 0) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        All technical keywords from the job offer are already evidenced in your resume.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These{" "}
        <strong>
          {missingKeywords.length} keyword{missingKeywords.length === 1 ? "" : "s"}
        </strong>{" "}
        appear in the job requirements but are not evidenced in your resume. They cannot be added
        automatically — you need to confirm whether you actually have this experience before including
        them.
      </p>
      <div className="flex flex-wrap gap-2">
        {missingKeywords.map((kw) => (
          <Badge
            key={kw}
            variant="outline"
            className="border-red-200 bg-red-50 text-red-800 hover:bg-red-50"
          >
            {kw}
          </Badge>
        ))}
      </div>
    </div>
  );
}
