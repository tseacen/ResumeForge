import { z } from "zod";

export const TailoringOperationSchema = z.object({
  id: z.string(),
  targetKind: z.enum(["summary", "experience", "project", "skill", "other"]),
  originalText: z.string().min(1),
  rewrittenText: z.string().min(1),
  reason: z.string().min(1),
  sourceFactIds: z.array(z.string()).min(1),
  matchedKeywords: z.array(z.string()).default([]),
});

export type TailoringOperation = z.infer<typeof TailoringOperationSchema>;

export const TailoringSkippedKeywordSchema = z.object({
  term: z.string(),
  reason: z.string(),
});

export type TailoringSkippedKeyword = z.infer<typeof TailoringSkippedKeywordSchema>;

export const TailoringPlanSchema = z.object({
  summary: z.string(),
  operations: z.array(TailoringOperationSchema).max(10).default([]),
  skippedKeywords: z.array(TailoringSkippedKeywordSchema).default([]),
});

export type TailoringPlan = z.infer<typeof TailoringPlanSchema>;

export const TailoringAuditItemSchema = z.object({
  id: z.string(),
  status: z.enum(["applied", "blocked", "skipped"]),
  targetKind: z.enum(["summary", "experience", "project", "skill", "other"]),
  originalText: z.string(),
  rewrittenText: z.string(),
  reason: z.string(),
  sourceFactIds: z.array(z.string()).default([]),
  matchedKeywords: z.array(z.string()).default([]),
  validationNotes: z.array(z.string()).default([]),
});

export type TailoringAuditItem = z.infer<typeof TailoringAuditItemSchema>;

export const TailoredResumeSchema = z.object({
  adaptedHtml: z.string(),
  summary: z.string(),
  audit: z.array(TailoringAuditItemSchema).default([]),
  skippedKeywords: z.array(TailoringSkippedKeywordSchema).default([]),
  generatedAt: z.string().datetime(),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
