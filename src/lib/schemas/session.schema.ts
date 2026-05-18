import { z } from "zod";

import {
  ChatMessageSchema,
  ClarificationQuestionSchema,
  ScoreTableSchema,
} from "@/lib/schemas/chat.schema";

export const AppPhaseSchema = z.enum([
  "setup-ai",
  "setup-cv",
  "ready-empty",
  "chat-analyzing",
  "chat-clarifying",
  "chat-scoring",
  "chat-scored",
  "chat-adapted",
]);

export type AppPhase = z.infer<typeof AppPhaseSchema>;

export const AdaptationSessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  status: z.enum(["analyzing", "clarifying", "scoring", "scored", "adapted"]).default("analyzing"),
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
  jobTitle: z.string().optional(),
  jobSummary: z.string().optional(),
  clarifications: z.array(ClarificationQuestionSchema).default([]),
  scoreTable: ScoreTableSchema.optional(),
  messages: z.array(ChatMessageSchema),
});

export type AdaptationSession = z.infer<typeof AdaptationSessionSchema>;
