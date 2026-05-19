import { z } from "zod";

import { TailoredResumeSchema } from "@/lib/schemas/tailoring.schema";

export const ScoreTableRowSchema = z.object({
  label: z.string(),
  value: z.number().min(0).max(100),
  rationale: z.string(),
  tone: z.enum(["good", "warn", "bad"]),
});

export type ScoreTableRow = z.infer<typeof ScoreTableRowSchema>;

export const ScoreTableNeedSchema = z.object({
  term: z.string(),
  level: z.enum(["required", "preferred", "bonus"]),
  reason: z.string().optional(),
});

export type ScoreTableNeed = z.infer<typeof ScoreTableNeedSchema>;

export const ScoreTableSchema = z.object({
  global: z.number().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high"]),
  verdict: z.string(),
  rows: z.array(ScoreTableRowSchema),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  missingKeywords: z.array(ScoreTableNeedSchema).default([]),
  interviewRisks: z.array(z.string()).default([]),
});

export type ScoreTable = z.infer<typeof ScoreTableSchema>;

export const ClarificationQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  question: z.string(),
  context: z.string(),
  responseMode: z.enum(["single", "multiple"]).default("single"),
  suggestedAnswers: z.array(z.string()).default([]),
  answeredWith: z.string().optional(),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

export const ChatMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("step"), id: z.string(), label: z.string(), done: z.boolean() }),
  z.object({ kind: z.literal("assistant"), id: z.string(), body: z.array(z.string()) }),
  z.object({
    kind: z.literal("user"),
    id: z.string(),
    body: z.string(),
    truncated: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("thinking"),
    id: z.string(),
    label: z.string(),
  }),
  z.object({
    kind: z.literal("clarifications"),
    id: z.string(),
    questions: z.array(ClarificationQuestionSchema),
  }),
  z.object({
    kind: z.literal("score-table"),
    id: z.string(),
    table: ScoreTableSchema,
  }),
  z.object({
    kind: z.literal("adaptation-result"),
    id: z.string(),
    result: TailoredResumeSchema,
  }),
  z.object({ kind: z.literal("error"), id: z.string(), message: z.string() }),
]);

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
