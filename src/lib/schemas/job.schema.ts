import { z } from "zod";

export const JobRequirementSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum([
    "technical_skill",
    "soft_skill",
    "experience",
    "education",
    "language",
    "domain",
    "seniority",
    "location",
    "availability",
  ]),
  importance: z.enum(["required", "preferred", "bonus"]),
  evidenceText: z.string().optional(),
});

export type JobRequirement = z.infer<typeof JobRequirementSchema>;

export const ParsedJobSchema = z.object({
  rawText: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  requirements: z.array(JobRequirementSchema),
  parsedAt: z.string().datetime(),
});

export type ParsedJob = z.infer<typeof ParsedJobSchema>;
