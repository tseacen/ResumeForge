#!/usr/bin/env node
/**
 * Wrapper du build Next.js pour Tauri.
 *
 * Pourquoi : `output: "export"` (TAURI_BUILD=1) interdit les routes /api/* (POST,
 * request.json, etc). Or en mode Tauri toute la logique passe par plugin-shell
 * côté client, donc ces routes ne servent à rien. On les met de côté le temps
 * du build puis on les restaure — même en cas d'échec.
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_DIR = join(ROOT, "src", "app", "api");
// Le stash est hors de `src/app/` : sinon Next.js l'inclurait quand même
// dans son scan de routes et planterait sur `output: "export"`.
const STASH_DIR = join(ROOT, ".tauri-api-stash");

function stash() {
  if (!existsSync(API_DIR)) return false;
  if (existsSync(STASH_DIR)) {
    throw new Error(
      `Stash directory already exists at ${STASH_DIR}. Aborting to avoid clobbering.`
    );
  }
  renameSync(API_DIR, STASH_DIR);
  return true;
}

function restore() {
  if (!existsSync(STASH_DIR)) return;
  if (existsSync(API_DIR)) {
    console.warn(
      `[tauri-build] Both ${API_DIR} and ${STASH_DIR} exist. Leaving the stash alone — please merge manually.`
    );
    return;
  }
  renameSync(STASH_DIR, API_DIR);
}

let didStash = false;
try {
  didStash = stash();
  if (didStash) console.warn("[tauri-build] /api routes stashed.");
  execSync("pnpm build", {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, TAURI_BUILD: "1" },
  });
} catch (err) {
  process.exitCode = 1;
  console.error("[tauri-build] build failed:", err instanceof Error ? err.message : err);
} finally {
  if (didStash) {
    restore();
    console.warn("[tauri-build] /api routes restored.");
  }
}
