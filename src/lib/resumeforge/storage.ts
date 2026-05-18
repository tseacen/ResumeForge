import {
  ResumeForgePersistedStateSchema,
  type ResumeForgePersistedState,
} from "@/lib/schemas/app.schema";
import { AppSettingsSchema } from "@/lib/schemas/settings.schema";

const STORAGE_KEY = "resumeforge.state.v1";

export function loadPersistedState(): ResumeForgePersistedState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    const strict = ResumeForgePersistedStateSchema.safeParse(parsed);
    if (strict.success) return strict.data;

    // Migration douce : si la structure globale a évolué (sessions/score), on garde
    // au moins les settings et le CV maître pour ne pas reset l'utilisateur.
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const settingsParse = AppSettingsSchema.safeParse(obj.settings);
      if (settingsParse.success) {
        return {
          version: 1,
          settings: settingsParse.data,
          masterResumeHtml:
            typeof obj.masterResumeHtml === "string" ? obj.masterResumeHtml : null,
          sessions: [],
          sessionArchive: [],
          activeSession: null,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function savePersistedState(state: ResumeForgePersistedState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
