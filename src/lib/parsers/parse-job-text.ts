import { type ParsedJob } from "@/lib/schemas/job.schema";

export function parseJobText(jobText: string): ParsedJob {
  return {
    rawText: jobText,
    originalUrl: undefined,
    title: undefined,
    company: undefined,
    location: undefined,
    workMode: undefined,
    parsedAt: new Date().toISOString(),
    requirements: [],
  };
}
