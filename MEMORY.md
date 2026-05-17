# MEMORY.md — Project Memory for Claude Code and Codex

## Product

Local-first desktop app for tailoring a resume to a job offer.

The user imports a current CV as HTML and pastes a job offer. The app analyzes compatibility, shows recruiter/ATS-style scores, detects blockers, then proposes an improved CV version without inventing facts.

## Stack

- Tauri
- Next.js
- TypeScript
- Tailwind CSS v4
- Minimal global CSS for tokens, base styles, keyframes, and CV paper rendering
- Zod
- pnpm
- Vitest
- Cheerio
- Local storage first

## Current implementation direction

The app has been refactored toward the `ResumeForge-2.zip` mockup:

- left sidebar with recent adaptations
- compact topbar
- onboarding/setup flow for AI provider and master CV
- chat-first job-offer analysis flow
- inline diagnostic, question, and generation cards
- right-side CV preview with Original / Adapted / Diff tabs
- localStorage persistence via `src/lib/resumeforge/storage.ts`

The old tabbed dashboard components were removed. Do not reintroduce `report-tab`, `resume-preview`, `audit-panel`, `missing-keywords`, `score-dashboard`, or `src/components/ui/*` unless explicitly requested.

The active UI is Tailwind-first. Keep `src/app/globals.css` minimal and do not rebuild broad custom `rf-*` component CSS.

## Main rule

Never invent facts.

Every generated CV change must be traceable to a source fact from:

- the original CV HTML
- manually validated user profile facts
- explicit user confirmation

Unsupported claims must be blocked or marked `needs_user_validation`.

## Command preference

Use RTK for commands when possible:

```bash
rtk pnpm test
rtk pnpm lint
rtk pnpm build
rtk git status
rtk git diff
rtk rg "pattern" .
```

Fallback to normal commands if RTK is not available.

## POC priority

Build a functional local POC before anything else.

Focus on:

1. schemas
2. parsing
3. scoring
4. tailoring
5. audit trail
6. mockup-faithful UI
7. Tauri packaging

Avoid:

- SaaS backend
- auth
- billing
- telemetry
- unsupported LinkedIn scraping
- over-engineering
