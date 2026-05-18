// Détecte si le code s'exécute dans une fenêtre Tauri (webview embarqué).
// Tauri v2 injecte `__TAURI_INTERNALS__` sur `window` dès le boot.
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}
