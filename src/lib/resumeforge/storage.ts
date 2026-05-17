import {
  ResumeForgePersistedStateSchema,
  type ResumeForgePersistedState,
} from "@/lib/schemas/app.schema";

const STORAGE_KEY = "resumeforge.state.v1";

export function loadPersistedState(): ResumeForgePersistedState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = ResumeForgePersistedStateSchema.safeParse(parsed);
    return result.success ? result.data : null;
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
