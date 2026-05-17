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

- `src/components/resumeforge-app.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/topbar.tsx`
- `src/components/setup/setup-flow.tsx`
- `src/components/chat/chat-pane.tsx`
- `src/components/preview/preview-pane.tsx`

Global CSS should stay limited to:

- design tokens
- base document styles
- keyframes
- scrollbar styling
- CV paper/diff rendering

Those global rules live in:

- `src/app/globals.css`

Do not reintroduce the old tabbed dashboard or shadcn runtime primitives unless explicitly requested.

Removed legacy pieces:

- `src/components/report-tab.tsx`
- `src/components/resume-preview.tsx`
- `src/components/audit-panel.tsx`
- `src/components/missing-keywords.tsx`
- `src/components/score-dashboard.tsx`
- `src/components/ui/*`
- `components.json`

## State Management

`src/components/resumeforge-app.tsx` owns the UI state with `useReducer`.

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

- `src/lib/resumeforge/storage.ts`
- browser `localStorage`
- Zod validation through `ResumeForgePersistedStateSchema`

## Data Model

Core schemas:

- `src/lib/schemas/resume.schema.ts`
- `src/lib/schemas/job.schema.ts`
- `src/lib/schemas/score.schema.ts`
- `src/lib/schemas/audit.schema.ts`
- `src/lib/schemas/chat.schema.ts`
- `src/lib/schemas/cv-document.schema.ts`
- `src/lib/schemas/session.schema.ts`
- `src/lib/schemas/settings.schema.ts`
- `src/lib/schemas/app.schema.ts`

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

- `src/lib/parsers/parse-resume-html.ts`
- `src/lib/parsers/parse-job-text.ts`
- `src/lib/scoring/score-compatibility.ts`
- `src/lib/tailoring/tailor-resume.ts`
- `src/lib/tailoring/audit-generated-resume.ts`
- `src/lib/analyze.ts`

`src/lib/analyze.ts` orchestrates:

1. resume parsing
2. job parsing
3. compatibility scoring
4. deterministic tailoring
5. generated-resume audit

## ResumeForge Session Layer

`src/lib/resumeforge/agent.ts` adapts deterministic analysis into the product experience:

- creates chat messages
- creates validation questions
- creates CV preview documents
- builds session summaries
- completes diagnostic sessions into adapted sessions

`src/lib/resumeforge/cv-document.ts` maps parsed/tailored resume data into `CvDocument` for the preview pane.

## LLM Provider Layer

LLM interfaces and provider stubs live in:

- `src/lib/llm/provider.ts`
- `src/lib/llm/mock-provider.ts`
- `src/lib/llm/openai-provider.ts`
- `src/lib/llm/anthropic-provider.ts`

The current POC must still work without remote API calls. Deterministic mode should remain available and testable.

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
