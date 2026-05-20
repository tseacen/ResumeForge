import { z } from "zod";

export const ResumeFactSchema = z.object({
  id: z.string(),
  source: z.enum(["resume_html", "manual_profile", "generated_audit"]),
  category: z.enum([
    "identity",
    "summary",
    "experience",
    "project",
    "skill",
    "education",
    "metric",
    "link",
    "availability",
  ]),
  text: z.string(),
  normalizedKeywords: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export type ResumeFact = z.infer<typeof ResumeFactSchema>;

export const ParsedResumeSchema = z.object({
  rawHtml: z.string(),
  facts: z.array(ResumeFactSchema),
  parsedAt: z.string().datetime(),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;
