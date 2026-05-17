# CLAUDE.md — ResumeForge CV Tailoring Agent POC

## Purpose

This file gives Claude Code persistent project instructions for building a local-first desktop app that analyzes, scores, and improves a resume against a job offer without inventing facts.

The project is a POC for a Tauri + Next.js + TypeScript + Tailwind application with a Tailwind-first ResumeForge v2 visual system.

The user provides:

1. Their current resume as HTML.
2. A job offer, usually pasted from LinkedIn or another job board.
3. Optionally, extra verified profile facts.

The app must:

- Parse the resume into structured data.
- Parse the job offer into structured requirements.
- Compare both.
- Produce compatibility statistics.
- Identify strengths, weaknesses, blockers, missing keywords, and interview risks.
- Generate an improved resume version adapted to the offer.
- Present the product as a chat-driven CV adaptation workspace with a live preview pane.
- Never fabricate skills, jobs, responsibilities, degrees, certifications, metrics, tools, or achievements.

## Non-negotiable product rules

### Truthfulness

Never add information that is not present in the source resume or explicitly validated by the user.

Allowed:

- Rewriting for clarity.
- Reordering sections.
- Highlighting existing experience.
- Rephrasing existing facts with better recruiter/ATS wording.
- Adding keywords only when they are clearly supported by existing facts.

Forbidden:

- Inventing experience.
- Inventing metrics.
- Inventing seniority.
- Inventing certifications.
- Inventing tools not already proven.
- Turning basic exposure into advanced mastery.
- Adding a technology because the job description asks for it unless the resume proves it.

When unsure, classify the suggestion as `needs_user_validation`.

### Traceability

Every generated bullet point, summary line, and skill must be linked to a source fact.

Use this classification:

- `proven`: directly supported by resume/profile data.
- `rewritten`: same fact, improved wording.
- `inferred_safe`: low-risk inference from multiple facts.
- `needs_user_validation`: plausible but not proven.
- `blocked`: should not be included because it would be misleading.

The generated CV must only include `proven`, `rewritten`, and carefully selected `inferred_safe` facts.

### Local-first

The POC must work locally by default.

Do not assume a backend SaaS exists.

Store data locally first:

- resume inputs
- job descriptions
- parsed JSON
- generated versions
- scoring reports
- audit reports

A remote LLM provider can be used, but the app architecture must allow swapping providers later.

### Agent-provider independence

Do not hardcode the app to one AI provider or one coding assistant.

The codebase must be friendly to:

- Claude Code
- OpenAI Codex
- OpenAI API
- Anthropic API
- Gemini API
- local models later

Use adapter interfaces and typed schemas.

## RTK command policy

This project should use `rtk` for shell commands whenever it is available.

RTK is a CLI proxy that compresses noisy terminal outputs before they enter an AI coding agent context. It is especially useful with Claude Code and Codex when running commands such as tests, linting, git operations, package manager commands, searches, and directory listings.

Default rule:

- Prefer `rtk <command>` over `<command>` for commands whose output may be long.
- If `rtk` is not installed or fails because the command is unsupported, fall back to the normal command.
- Do not let RTK hide important errors. When debugging, request enough detail to understand the failure.
- Use short, targeted commands instead of broad commands that dump huge outputs.

Examples:

```bash
rtk pnpm test
rtk pnpm lint
rtk pnpm build
rtk git status
rtk git diff
rtk git log --oneline -20
rtk find . -maxdepth 3 -type f
rtk rg "ResumeSchema" .
rtk ls -la
```

Avoid unnecessarily noisy commands:

```bash
# Avoid unless needed
pnpm test -- --verbose
find . -type f
cat large-file.json
git diff
```

Prefer targeted versions:

```bash
rtk pnpm test -- resume-parser.test.ts
rtk rg "tailorResume" packages apps
rtk git diff -- src/lib/resume.ts
```

If setting up the developer environment, recommend installing RTK separately, but do not make the app depend on RTK at runtime.

## Recommended stack

Use these technologies unless the user asks otherwise:

- Tauri for desktop shell.
- Next.js for UI.
- TypeScript everywhere.
- Tailwind CSS v4 for the active UI.
- Minimal CSS in `src/app/globals.css` for design tokens, base styles, keyframes, scrollbar styling, and CV paper/diff rendering.
- Zod for schemas and validation.
- pnpm as package manager.
- Vitest for unit tests.
- Playwright only if browser/e2e testing becomes necessary.
- SQLite or local JSON files for the first POC.
- Cheerio for HTML parsing.
- Vercel AI SDK or a small provider adapter layer for LLM calls.

Do not reintroduce shadcn runtime primitives for the current UI unless the user explicitly asks. The active app intentionally removed `src/components/ui/*`, `components.json`, `clsx`, `tailwind-merge`, `class-variance-authority`, and `@base-ui/react`.

## Bootstrap commands

Prefer official generators and package commands. Do not manually create boilerplate when a generator exists.

Suggested bootstrap flow:

```bash
# 1. Create the Next.js app
pnpm create next-app@latest resume-forge \
  --ts \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd resume-forge

# 2. Install core dependencies
pnpm add zod cheerio nanoid lucide-react domhandler
pnpm add -D vitest tsx @types/node

# 3. Add Tauri
pnpm add -D @tauri-apps/cli
pnpm tauri init
```

When running commands during implementation, use RTK where useful:

```bash
rtk pnpm build
rtk pnpm lint
rtk pnpm test
rtk git status
```

## Target repository structure

```txt
resume-forge/
├─ CLAUDE.md
├─ AGENTS.md
├─ MEMORY.md
├─ README.md
├─ package.json
├─ src/
│  ├─ app/
│  │  ├─ page.tsx
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ resumeforge-app.tsx
│  │  ├─ chat/
│  │  │  └─ chat-pane.tsx
│  │  ├─ layout/
│  │  │  ├─ sidebar.tsx
│  │  │  └─ topbar.tsx
│  │  ├─ preview/
│  │  │  └─ preview-pane.tsx
│  │  └─ setup/
│  │     └─ setup-flow.tsx
│  ├─ lib/
│  │  ├─ schemas/
│  │  │  ├─ resume.schema.ts
│  │  │  ├─ job.schema.ts
│  │  │  ├─ score.schema.ts
│  │  │  ├─ audit.schema.ts
│  │  │  ├─ app.schema.ts
│  │  │  ├─ chat.schema.ts
│  │  │  ├─ cv-document.schema.ts
│  │  │  ├─ session.schema.ts
│  │  │  └─ settings.schema.ts
│  │  ├─ parsers/
│  │  │  ├─ parse-resume-html.ts
│  │  │  └─ parse-job-text.ts
│  │  ├─ scoring/
│  │  │  └─ score-compatibility.ts
│  │  ├─ tailoring/
│  │  │  ├─ tailor-resume.ts
│  │  │  └─ audit-generated-resume.ts
│  │  ├─ llm/
│  │  │  ├─ provider.ts
│  │  │  ├─ openai-provider.ts
│  │  │  ├─ anthropic-provider.ts
│  │  │  └─ mock-provider.ts
│  │  └─ resumeforge/
│  │     ├─ agent.ts
│  │     ├─ cv-document.ts
│  │     ├─ sample-data.ts
│  │     └─ storage.ts
│  └─ tests/
│     ├─ parse-resume-html.test.ts
│     ├─ parse-job-text.test.ts
│     ├─ score-compatibility.test.ts
│     └─ audit-generated-resume.test.ts
├─ src-tauri/
├─ .claude/
│  └─ commands/
│     ├─ analyze-cv.md
│     ├─ tailor-cv.md
│     └─ audit-truthfulness.md
└─ docs/
   ├─ ROADMAP.md
   ├─ ARCHITECTURE.md
   └─ DECISIONS.md
```

For the POC, keep everything in one Next.js app first. Do not prematurely create a monorepo unless the user asks for it.

## POC functional scope

The POC must include:

1. Resume HTML input.
2. Job offer text input.
3. Resume parser.
4. Job parser.
5. Compatibility scoring.
6. Recruiter-style report.
7. Generated improved resume in HTML.
8. Anti-hallucination audit trail surfaced in the product flow.
9. Local save/load of at least one analysis.
10. Mockup-faithful, responsive ResumeForge v2 UI.

Do not start with:

- user accounts
- SaaS billing
- remote database
- LinkedIn scraping automation
- complex template marketplace
- browser extension
- multi-user collaboration

## Core data schemas

Use Zod schemas as the source of truth.

### Resume facts

```ts
export const ResumeFactSchema = z.object({
  id: z.string(),
  source: z.enum(["resume_html", "manual_profile", "generated_audit"]),
  category: z.enum([
    "identity",
    "summary",
    "experience",
    "project",
    "skill",
    "education",
    "metric",
    "link",
    "availability",
  ]),
  text: z.string(),
  normalizedKeywords: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});
```

### Job requirements

```ts
export const JobRequirementSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum([
    "technical_skill",
    "soft_skill",
    "experience",
    "education",
    "language",
    "domain",
    "seniority",
    "location",
    "availability",
  ]),
  importance: z.enum(["required", "preferred", "bonus"]),
  evidenceText: z.string().optional(),
});
```

### Compatibility score

```ts
export const CompatibilityScoreSchema = z.object({
  global: z.number().min(0).max(100),
  ats: z.number().min(0).max(100),
  recruiterFit: z.number().min(0).max(100),
  technicalFit: z.number().min(0).max(100),
  seniorityFit: z.number().min(0).max(100),
  marketFit: z.number().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high"]),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  blockers: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  interviewRisks: z.array(z.string()),
});
```

### Resume change audit

```ts
export const ResumeChangeAuditSchema = z.object({
  changeId: z.string(),
  targetSection: z.string(),
  originalText: z.string().optional(),
  newText: z.string(),
  reason: z.string(),
  classification: z.enum([
    "proven",
    "rewritten",
    "inferred_safe",
    "needs_user_validation",
    "blocked",
  ]),
  sourceFactIds: z.array(z.string()),
  risk: z.enum(["low", "medium", "high"]),
});
```

## Scoring logic

Use deterministic scoring first. The LLM may explain results, but the scoring calculation should be reproducible.

Suggested weighted score:

- Technical fit: 35%
- Recruiter fit: 25%
- ATS keywords: 20%
- Seniority fit: 10%
- Market/domain fit: 10%

Example:

```ts
global =
  technicalFit * 0.35 + recruiterFit * 0.25 + ats * 0.2 + seniorityFit * 0.1 + marketFit * 0.1;
```

The report must explain the score in human terms.

## LLM usage

The LLM should be used for:

- extracting requirements from unstructured job text
- improving wording
- explaining compatibility
- identifying recruiter concerns
- proposing safe rewrites
- producing final polished HTML

The LLM should not be trusted blindly.

Always validate:

- output JSON with Zod
- generated bullets against source facts
- forbidden additions
- unsupported keywords
- risky claims

Use a mock provider for tests.

## UI requirements

The POC UI should follow the ResumeForge v2 mockup in `ResumeForge-2.zip`.

Current product flow:

1. Left sidebar:
   - product mark and `ResumeForge` brand
   - `Nouvelle adaptation` action
   - recent adaptation sessions
   - local user/settings footer
2. Compact topbar:
   - setup title during onboarding
   - active adaptation title after analysis
   - history/export/reset actions when relevant
3. Setup phase:
   - step rail with `Configurer l'IA`, `Ajouter le CV de base`, `Prêt à adapter`
   - Claude Code and OpenAI Codex provider cards
   - local/deterministic fallback remains available in logic but should not visually disturb the mockup layout
   - master CV import through pasted HTML or local file
4. Chat phase:
   - centered welcome prompt
   - job-offer paste action
   - assistant/user message stream
   - inline stats card
   - inline validation questions
   - generation progress and CTA
   - sticky composer
5. Preview phase:
   - right-side CV pane
   - Original / Adapted / Diff modes
   - export action for adapted HTML

Visual direction:

- warm cream background
- terracotta accent
- Source Serif-like display typography
- compact Claude-style cards
- subtle borders and shadows
- no purple/dark-mode bias
- avoid returning to the old tabbed dashboard

Do not reintroduce the removed legacy components unless explicitly requested:

- `report-tab`
- `resume-preview`
- `audit-panel`
- `missing-keywords`
- `score-dashboard`
- `src/components/ui/*`

## Implementation roadmap

### Phase 0 — Project setup

- Create Next.js app.
- Add Tailwind, Zod, Vitest, Cheerio, nanoid, lucide-react.
- Add Tauri.
- Create base layout.
- Add lint/test/build scripts.
- Verify with:

```bash
rtk pnpm lint
rtk pnpm test
rtk pnpm build
```

### Phase 1 — Schemas and parsing

- Create Zod schemas.
- Implement resume HTML parser.
- Implement job text parser.
- Add tests with sample resume and sample job offer.
- Ensure parsers return stable JSON.

### Phase 2 — Deterministic scoring

- Implement keyword matching.
- Implement technical fit.
- Implement ATS score.
- Implement seniority fit.
- Implement blocker detection.
- Add unit tests.

### Phase 3 — Resume tailoring engine

- Implement a first deterministic tailoring function.
- Improve summary and bullet ordering.
- Add missing supported keywords.
- Generate HTML from structured resume data.
- Add audit trail for every change.

### Phase 4 — LLM adapter

- Add provider interface.
- Add mock provider.
- Add OpenAI and Anthropic provider stubs.
- Make the app work without an API key using deterministic mode.
- Add API key config later, locally only.

### Phase 5 — UI integration

- Build the ResumeForge v2 app shell in `src/components/resumeforge-app.tsx`.
- Keep layout components in `src/components/layout/`.
- Keep setup components in `src/components/setup/`.
- Keep chat components in `src/components/chat/`.
- Keep preview components in `src/components/preview/`.
- Keep mockup-specific layout and component styling in Tailwind class names where possible.
- Keep `src/app/globals.css` limited to tokens, base styles, keyframes, scrollbar styling, and CV paper/diff rendering.
- Display compatibility diagnostics as inline chat cards.
- Display validation questions as inline chat cards.
- Display the improved CV in the right preview pane.
- Add Original / Adapted / Diff preview modes.
- Add export/download actions.
- Preserve visual fidelity to `ResumeForge-2.zip`.

### Phase 6 — Tauri packaging

- Confirm Next.js works inside Tauri.
- Add file import/export via Tauri.
- Package local desktop POC.
- Do not optimize native features too early.

## Claude Code commands to create

Create these files under `.claude/commands/`.

### `.claude/commands/analyze-cv.md`

```md
Analyze the current ResumeForge implementation.

Focus on:

- correctness
- truthfulness rules
- schema validation
- scoring logic
- missing tests
- UI usability
- mockup fidelity against `ResumeForge-2.zip`

Use RTK for commands when available.
Run:

- rtk pnpm lint
- rtk pnpm test
- rtk pnpm build

Return:

1. Issues found
2. Risk level
3. Recommended fixes
4. Files to edit
```

### `.claude/commands/tailor-cv.md`

```md
Implement or improve the CV tailoring workflow.

Rules:

- Never invent facts.
- Every generated CV change must include an audit record.
- Validate all structured data with Zod.
- Keep deterministic logic separate from LLM logic.
- Use RTK for shell commands when available.

Expected result:

- Tailored resume HTML
- Compatibility report
- Audit trail
- Tests for the main behavior
```

### `.claude/commands/audit-truthfulness.md`

```md
Audit the app for hallucination risks.

Check:

- whether generated bullets are traceable to source facts
- whether unsupported job keywords are added
- whether generated metrics are invented
- whether risky claims are blocked or marked as needs_user_validation
- whether tests cover these cases

Use RTK for commands when available.

Return a prioritized list of fixes.
```

## Coding rules

- Prefer small files.
- Prefer pure functions in `src/lib`.
- Keep UI components dumb when possible.
- Use TypeScript strictness.
- Avoid `any`.
- Validate external/LLM data with Zod.
- Add tests for parsers, scoring, tailoring, and audit logic.
- Do not commit secrets.
- Do not log API keys.
- Do not send resume data to an LLM without explicit user action.
- Keep prompts in dedicated files or constants.
- Keep generated data distinguishable from user-provided data.

## Security and privacy

Resume and job data are sensitive.

The app must:

- store data locally by default
- avoid analytics in the POC
- avoid external calls unless explicitly triggered
- never send data to a provider silently
- make API provider usage transparent
- allow deleting local data

Do not implement telemetry in the POC.

## Definition of done for the POC

The POC is considered functional when:

- A user can paste CV HTML.
- A user can paste a job offer.
- The app extracts structured resume facts and job requirements.
- The app computes compatibility scores.
- The app shows strengths, weaknesses, blockers, and missing keywords.
- The app generates a safer improved CV HTML.
- The app shows an audit trail proving what changed and why.
- Unsupported claims are blocked or marked for validation.
- The UI remains faithful to the ResumeForge v2 mockup direction.
- Main logic has unit tests.
- The app runs locally with `pnpm dev`.
- The desktop shell runs with Tauri.
- Common commands are run through `rtk` when available.

## Current project priority

Build a working POC first.

Prefer:

- simple, functional, tested flows
- clear schemas
- strong truthfulness guardrails
- mockup-faithful UI
- local-first behavior

Avoid:

- over-engineering
- premature SaaS architecture
- excessive agent complexity
- fake ATS precision
- unsupported LinkedIn scraping
- features that require accounts or payments
