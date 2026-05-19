// Tauri v2 injects __TAURI_INTERNALS__ on window at boot.
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}
