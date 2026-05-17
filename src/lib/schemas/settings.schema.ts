import { z } from "zod";

export const AIProviderIdSchema = z.enum(["claude-code", "openai-codex", "mock"]);
export type AIProviderId = z.infer<typeof AIProviderIdSchema>;

export const ProviderStatusSchema = z.enum(["idle", "checking", "available", "unavailable"]);
export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;

export const AppSettingsSchema = z.object({
  selectedProvider: AIProviderIdSchema.default("claude-code"),
  onboardingCompleted: z.boolean().default(false),
  language: z.enum(["fr", "en"]).default("fr"),
  selectedModels: z.record(z.string(), z.string()).default({}),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;
