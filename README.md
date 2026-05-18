# ResumeForge

Local-first CV tailoring agent (POC), built with Next.js + Tauri.

ResumeForge helps users adapt a master CV to a job offer while preserving factual accuracy.  
The core objective is simple: improve relevance without fabricating claims.

## Why ResumeForge

Most CV optimization flows either stay too generic or drift into hallucinated content.  
ResumeForge is designed to be:

- local-first
- traceable
- deterministic where possible
- strict about factual integrity

## Critical Rule: No Invented Resume Facts

ResumeForge must never invent:

- skills
- companies
- job titles
- metrics
- certifications
- degrees
- tools
- responsibilities
- production experience
- seniority

Only use information supported by the source CV HTML or explicitly validated by the user.

Generated changes are expected to be audited with statuses such as:

- `proven`
- `rewritten`
- `inferred_safe`
- `needs_user_validation`
- `blocked`

## Current Product Direction

The active UI follows the `ResumeForge-2.zip` mockup direction:

- warm cream and terracotta visual system
- fixed left sidebar
- compact topbar
- setup flow for AI provider and master CV import
- chat-centered job-offer flow
- inline diagnostics and validation cards
- right-side preview with `Original`, `Adapted`, and `Diff` modes

The legacy tabbed dashboard UI is intentionally removed.

## POC Scope

Implemented target scope:

- paste/import resume HTML
- paste job offer text
- parse and structure both inputs
- compute compatibility score
- generate recruiter-style gap analysis
- generate adapted resume HTML
- produce an audit trail for changes
- keep data local-first

Out of scope for this phase:

- SaaS backend
- auth/billing
- remote database
- scraping automation
- browser extension

## Tech Stack

- Tauri v2
- Next.js
- React
- TypeScript
- Tailwind CSS v4
- Zod
- Cheerio
- pnpm
- Vitest

## Repository Layout

```txt
src/
  app/
  components/
    chat/
    layout/
    preview/
    setup/
  lib/
    parsers/
    scoring/
    tailoring/
    llm/
    resumeforge/
    schemas/
  tests/
src-tauri/
docs/
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- Rust toolchain (for Tauri desktop builds)

### Install

```bash
pnpm install
```

### Run Web App

```bash
pnpm dev
```

### Run Desktop App (Tauri)

```bash
pnpm tauri:dev
```

### Production Build

```bash
pnpm build
pnpm tauri:build
```

## Optional Environment Variables

The app can work via in-app provider setup, but these variables are optionally supported:

- `NEXT_PUBLIC_OPENAI_API_KEY`
- `NEXT_PUBLIC_ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## Quality Checks

Run before opening a PR:

```bash
pnpm lint
pnpm test
pnpm build
```

If you use RTK locally, you can prefix commands with `rtk`.

## CI/CD

GitHub workflows are configured for:

- CI checks on PRs and pushes to `main`
- dependency review on PRs
- Tauri multi-platform release builds on version tags (`v*`)

`main` is protected by rulesets, so contributions should go through pull requests.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## Security

For sensitive vulnerabilities, do not open a public issue.  
Use GitHub private vulnerability reporting from the repository Security tab.

## Additional Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisions](docs/DECISIONS.md)
