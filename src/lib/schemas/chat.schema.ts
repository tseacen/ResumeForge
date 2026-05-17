import { z } from "zod";

export const ChatStatRowSchema = z.object({
  label: z.string(),
  value: z.number().min(0).max(100),
  tone: z.enum(["good", "warn", "bad"]),
  icon: z.enum(["target", "briefcase", "tag", "layers", "chart"]),
});

export type ChatStatRow = z.infer<typeof ChatStatRowSchema>;

export const ChatNeedSchema = z.object({
  term: z.string(),
  level: z.enum(["required", "preferred", "bonus"]),
});

export type ChatNeed = z.infer<typeof ChatNeedSchema>;

export const ValidationQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  question: z.string(),
  context: z.string(),
  suggestedAnswers: z.array(z.string()).default([]),
  answeredWith: z.string().optional(),
});

export type ValidationQuestion = z.infer<typeof ValidationQuestionSchema>;

export const ChatMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("step"), id: z.string(), label: z.string(), done: z.boolean() }),
  z.object({ kind: z.literal("assistant"), id: z.string(), body: z.array(z.string()) }),
  z.object({ kind: z.literal("assistant-typing"), id: z.string(), label: z.string() }),
  z.object({
    kind: z.literal("user"),
    id: z.string(),
    body: z.string(),
    truncated: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("stats"),
    id: z.string(),
    title: z.string(),
    score: z.number().min(0).max(100),
    delta: z.number().optional(),
    rows: z.array(ChatStatRowSchema),
    needs: z.array(ChatNeedSchema).default([]),
  }),
  z.object({ kind: z.literal("question"), id: z.string(), question: ValidationQuestionSchema }),
  z.object({ kind: z.literal("generating"), id: z.string(), label: z.string(), done: z.boolean() }),
  z.object({ kind: z.literal("error"), id: z.string(), message: z.string() }),
]);

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
