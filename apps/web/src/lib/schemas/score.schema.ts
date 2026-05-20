import { z } from "zod";

export const CompatibilityScoreSchema = z.object({
  global: z.number().min(0).max(100),
  ats: z.number().min(0).max(100),
  recruiterFit: z.number().min(0).max(100),
  technicalFit: z.number().min(0).max(100),
  seniorityFit: z.number().min(0).max(100),
  marketFit: z.number().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high"]),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  blockers: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  interviewRisks: z.array(z.string()),
});

export type CompatibilityScore = z.infer<typeof CompatibilityScoreSchema>;
