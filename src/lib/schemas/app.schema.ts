import { z } from "zod";

import {
  AdaptationSessionSchema,
  AdaptationSessionSummarySchema,
  AppPhaseSchema,
} from "@/lib/schemas/session.schema";
import { AppSettingsSchema, ProviderStatusSchema } from "@/lib/schemas/settings.schema";

export const ResumeForgePersistedStateSchema = z.object({
  version: z.literal(1),
  settings: AppSettingsSchema,
  masterResumeHtml: z.string().nullable(),
  sessions: z.array(AdaptationSessionSummarySchema),
  sessionArchive: z.array(AdaptationSessionSchema).default([]),
  activeSession: AdaptationSessionSchema.nullable(),
});

export type ResumeForgePersistedState = z.infer<typeof ResumeForgePersistedStateSchema>;

export const ResumeForgeStateSchema = ResumeForgePersistedStateSchema.extend({
  phase: AppPhaseSchema,
  providerStatus: z.object({
    "claude-code": ProviderStatusSchema,
    "openai-codex": ProviderStatusSchema,
    mock: ProviderStatusSchema,
  }),
  previewMode: z.enum(["original", "adapted", "diff"]).default("original"),
  error: z.string().nullable().default(null),
});

export type ResumeForgeState = z.infer<typeof ResumeForgeStateSchema>;
