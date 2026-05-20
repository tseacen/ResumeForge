# Roadmap

## Phase 1 — Stabilize ResumeForge v2 UI

- Keep visual fidelity to `ResumeForge-2.zip`.
- Tighten responsive behavior for setup, chat, and preview panes.
- Add screenshots or visual checks for core phases:
  - setup AI
  - setup CV
  - ready empty
  - diagnostic
  - adapted
- Keep component styling Tailwind-first.
- Keep `apps/web/src/app/globals.css` minimal: tokens, base styles, keyframes, scrollbar, CV paper/diff.

## Phase 2 — Strengthen Local Persistence

- Add explicit local reset/delete controls.
- Store multiple sessions safely.
- Add Zod migration path for persisted state versions.
- Consider moving from localStorage to Tauri-backed local files when desktop usage becomes primary.

## Phase 3 — Improve Truthfulness Workflow

- Make validation questions actionable before generation.
- Block unsupported claims visibly.
- Surface audit classifications in the chat and preview.
- Add stronger tests around unsupported keyword insertion.
- Keep deterministic scoring separate from rewriting.

## Phase 4 — Provider Integration

- Keep deterministic mode as the fallback.
- Wire Claude Code / Codex CLI detection for provider cards.
- Add explicit provider invocation only after user action.
- Validate all provider outputs with Zod.
- Keep prompts/constants in dedicated files if provider flows grow.

## Phase 5 — Tauri Desktop Polish

- Validate `pnpm tauri:dev`.
- Add local file import/export via Tauri APIs.
- Ensure no network/backend assumptions.
- Package a local desktop POC.

## Phase 6 — Testing Expansion

Current baseline:

- parser tests
- scoring tests
- tailoring tests
- audit tests
- LLM provider tests

Add next:

- session creation tests for `apps/web/src/lib/resumeforge/agent.ts`
- CV document mapping tests for `apps/web/src/lib/resumeforge/cv-document.ts`
- storage schema migration tests
- component smoke tests if React testing infrastructure is added
- optional Playwright visual/user-flow checks later
