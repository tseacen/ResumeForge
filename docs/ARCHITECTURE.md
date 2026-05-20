# Architecture

ResumeForge is a local-first desktop/web POC built with Tauri, Next.js, TypeScript, Tailwind CSS v4, Zod, and Vitest.

## Product Flow

1. User configures the preferred local AI provider.
2. User imports or pastes a master CV in HTML.
3. User pastes a job offer in the chat flow.
4. App parses the CV and job offer deterministically.
5. App computes compatibility scores and risk areas.
6. App asks validation questions for claims that are useful but not proven.
7. App generates an adapted CV using only supported facts.
8. App displays the result in the right-side preview with `Original`, `Adapted`, and `Diff` modes.
9. User exports adapted HTML.

## UI Architecture

The UI is intentionally mockup-first and Tailwind-first. Use Tailwind utilities in components for layout, spacing, borders, colors, and typography whenever possible.

Active components:

- `apps/web/src/components/resumeforge-app.tsx`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/components/layout/topbar.tsx`
- `apps/web/src/components/setup/setup-flow.tsx`
- `apps/web/src/components/chat/chat-pane.tsx`
- `apps/web/src/components/preview/preview-pane.tsx`

Global CSS should stay limited to:

- design tokens
- base document styles
- keyframes
- scrollbar styling
- CV paper/diff rendering

Those global rules live in:

- `apps/web/src/app/globals.css`

Do not reintroduce the old tabbed dashboard or shadcn runtime primitives unless explicitly requested.

Removed legacy pieces:

- `apps/web/src/components/report-tab.tsx`
- `apps/web/src/components/resume-preview.tsx`
- `apps/web/src/components/audit-panel.tsx`
- `apps/web/src/components/missing-keywords.tsx`
- `apps/web/src/components/score-dashboard.tsx`
- `apps/web/src/components/ui/*`
- `components.json`

## State Management

`apps/web/src/components/resumeforge-app.tsx` owns the UI state with `useReducer`.

Main state domains:

- `phase`: setup, ready, diagnostic, generating, adapted
- `settings`: selected provider, onboarding completion, language
- `masterResumeHtml`: source CV HTML
- `sessions`: recent session summaries
- `sessionArchive`: full local session records
- `activeSession`: current adaptation session
- `providerStatus`: provider availability state
- `previewMode`: `original`, `adapted`, or `diff`
- `error`: recoverable UI error

Persistence uses:

- `apps/web/src/lib/resumeforge/storage.ts`
- browser `localStorage`
- Zod validation through `ResumeForgePersistedStateSchema`

## Data Model

Core schemas:

- `apps/web/src/lib/schemas/resume.schema.ts`
- `apps/web/src/lib/schemas/job.schema.ts`
- `apps/web/src/lib/schemas/score.schema.ts`
- `apps/web/src/lib/schemas/audit.schema.ts`
- `apps/web/src/lib/schemas/chat.schema.ts`
- `apps/web/src/lib/schemas/cv-document.schema.ts`
- `apps/web/src/lib/schemas/session.schema.ts`
- `apps/web/src/lib/schemas/settings.schema.ts`
- `apps/web/src/lib/schemas/app.schema.ts`

Important derived models:

- `AdaptationSession`
- `AdaptationSessionSummary`
- `ChatMessage`
- `ValidationQuestion`
- `CvDocument`
- `CvSection`
- `CvLine`

## Deterministic Engine

The deterministic engine remains separate from UI and LLM provider logic.

Modules:

- `apps/web/src/lib/parsers/parse-resume-html.ts` — extracts structured facts from a resume HTML string
- `apps/web/src/lib/tailoring/adapt-resume.ts` — applies a LLM-generated rewrite plan to the original HTML, auditing every change

Job parsing, compatibility scoring, and the tailoring plan are produced by the LLM layer (see below). `adapt-resume.ts` enforces truthfulness constraints deterministically before any change reaches the output HTML.

## ResumeForge Session Layer

`apps/web/src/lib/resumeforge/agent.ts` adapts LLM results into the product experience:

- creates and mutates chat messages
- manages clarification questions and answers
- builds score tables and adaptation result messages
- summarizes sessions for the sidebar

`apps/web/src/lib/resumeforge/storage.ts` handles `localStorage` persistence with schema migration.

## LLM Provider Layer

LLM interfaces and providers live in `apps/web/src/lib/llm/`:

- `provider.ts` — shared interface
- `runner.ts` — orchestrates the three LLM steps: job analysis, scoring, tailoring plan
- `prompts.ts` — system prompts and Zod schemas for LLM responses
- `resolve-provider.ts` — resolves the active provider from settings, checks CLI availability
- `client.ts` — UI-facing facade that routes calls to `/api/*` routes
- `cli-provider.ts` / `tauri-provider.ts` — spawn the local CLI (Node.js and Tauri variants)
- `anthropic-provider.ts` / `openai-provider.ts` — direct API calls with a key
- `mock-provider.ts` — deterministic stub for tests
- `models-client.ts` — fetches the model list from provider APIs, with a curated fallback
- `parse-json.ts` — extracts and validates JSON from LLM output
- `runtime.ts` — detects Tauri vs. web context

## Privacy Model

Resume and job data are sensitive.

Rules:

- local-first by default
- no telemetry
- no SaaS backend
- no remote database
- no provider call unless explicit
- no API keys in logs
- no invented claims
