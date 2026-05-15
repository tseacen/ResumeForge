# MEMORY.md — Project Memory for Claude Code and Codex

## Product

Local-first desktop app for tailoring a resume to a job offer.

The user imports a current CV as HTML and pastes a job offer. The app analyzes compatibility, shows recruiter/ATS-style scores, detects blockers, then proposes an improved CV version without inventing facts.

## Stack

- Tauri
- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Zod
- pnpm
- Vitest
- Cheerio
- Local storage first

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
6. clean UI
7. Tauri packaging

Avoid:

- SaaS backend
- auth
- billing
- telemetry
- unsupported LinkedIn scraping
- over-engineering
