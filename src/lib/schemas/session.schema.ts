import { z } from "zod";

import { ResumeChangeAuditSchema } from "@/lib/schemas/audit.schema";
import { ChatMessageSchema, ValidationQuestionSchema } from "@/lib/schemas/chat.schema";
import { CvDocumentSchema } from "@/lib/schemas/cv-document.schema";
import { ParsedJobSchema } from "@/lib/schemas/job.schema";
import { ParsedResumeSchema } from "@/lib/schemas/resume.schema";
import { CompatibilityScoreSchema } from "@/lib/schemas/score.schema";

export const AppPhaseSchema = z.enum([
  "setup-ai",
  "setup-cv",
  "ready-empty",
  "chat-diagnostic",
  "chat-generating",
  "chat-adapted",
]);

export type AppPhase = z.infer<typeof AppPhaseSchema>;

export const AdaptationSessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  status: z.enum(["diagnostic", "adapted"]).default("diagnostic"),
  updatedAt: z.string().datetime(),
});

export type AdaptationSessionSummary = z.infer<typeof AdaptationSessionSummarySchema>;

export const AdaptationSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  phase: AppPhaseSchema,
  jobText: z.string(),
  parsedJob: ParsedJobSchema.optional(),
  parsedResume: ParsedResumeSchema.optional(),
  score: CompatibilityScoreSchema.optional(),
  originalDocument: CvDocumentSchema.optional(),
  adaptedDocument: CvDocumentSchema.optional(),
  tailoredHtml: z.string().optional(),
  audits: z.array(ResumeChangeAuditSchema).default([]),
  validationQuestions: z.array(ValidationQuestionSchema).default([]),
  messages: z.array(ChatMessageSchema),
});

export type AdaptationSession = z.infer<typeof AdaptationSessionSchema>;
