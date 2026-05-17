# ResumeForge

Local-first CV tailoring agent POC.

ResumeForge helps a user adapt a master CV to a job offer without inventing facts. The app parses a resume HTML file, parses a job offer, scores compatibility, surfaces recruiter/ATS risks, asks validation questions when claims are not proven, and generates an adapted CV with an audit trail.

## Current Direction

The active UI follows the `ResumeForge-2.zip` mockup direction:

- warm cream and terracotta visual system
- fixed left sidebar with recent adaptations
- compact topbar
- setup flow for AI provider and master CV import
- chat-first job offer analysis
- inline diagnostic, validation, and generation cards
- right-side CV preview with `Original`, `Adapted`, and `Diff` modes

The previous tabbed dashboard UI has been removed. Do not reintroduce `report-tab`, `resume-preview`, `audit-panel`, `missing-keywords`, `score-dashboard`, or `src/components/ui/*` unless explicitly requested.

## Stack

- Tauri
- Next.js
- React
- TypeScript
- Tailwind CSS v4
- minimal global CSS for tokens, keyframes, base styles, and CV paper rendering
- Zod
- Cheerio
- nanoid
- lucide-react
- pnpm
- Vitest

## Product Rules

ResumeForge must never invent resume facts.

Do not invent:

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

Only use facts supported by the original CV HTML or explicitly validated by the user.

Generated CV changes must be traceable as:

- `proven`
- `rewritten`
- `inferred_safe`
- `needs_user_validation`
- `blocked`

Only safe supported content should appear in the final CV.

## Project Structure

```txt
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    resumeforge-app.tsx
    chat/
      chat-pane.tsx
    layout/
      sidebar.tsx
      topbar.tsx
    preview/
      preview-pane.tsx
    setup/
      setup-flow.tsx
  lib/
    analyze.ts
    parsers/
      parse-job-text.ts
      parse-resume-html.ts
    scoring/
      score-compatibility.ts
    tailoring/
      audit-generated-resume.ts
      tailor-resume.ts
    resumeforge/
      agent.ts
      cv-document.ts
      sample-data.ts
      storage.ts
    schemas/
      app.schema.ts
      audit.schema.ts
      chat.schema.ts
      cv-document.schema.ts
      job.schema.ts
      resume.schema.ts
      score.schema.ts
      session.schema.ts
      settings.schema.ts
  tests/
src-tauri/
docs/
```

## Key Modules

- `src/components/resumeforge-app.tsx`: top-level client state machine and app shell.
- `src/components/setup/setup-flow.tsx`: AI provider setup and master CV import.
- `src/components/chat/chat-pane.tsx`: chat stream, diagnostics, questions, generation CTA, composer.
- `src/components/preview/preview-pane.tsx`: right-side CV preview and diff view.
- `src/lib/resumeforge/agent.ts`: creates and completes adaptation sessions from deterministic analysis.
- `src/lib/resumeforge/cv-document.ts`: maps parsed resume data into preview-ready CV documents.
- `src/lib/resumeforge/storage.ts`: localStorage persistence.
- `src/lib/analyze.ts`: deterministic parse, score, tailor, audit orchestration.
- `src/lib/parsers/*`: resume and job parsing.
- `src/lib/scoring/score-compatibility.ts`: deterministic scoring.
- `src/lib/tailoring/*`: safe tailoring and audit logic.

## Commands

Use `rtk` when available:

```bash
rtk pnpm lint
rtk pnpm test
rtk pnpm build
rtk git status
rtk git diff
```

Fallback without RTK:

```bash
pnpm lint
pnpm test
pnpm build
```

Run the web app:

```bash
pnpm dev
```

Run the desktop shell:

```bash
pnpm tauri:dev
```

## Validation

Before considering a change complete, run:

```bash
rtk pnpm lint
rtk pnpm test
rtk pnpm build
```

Note: `next build` with Turbopack may need to run outside a restricted sandbox because CSS processing can spawn a worker that binds to a local port.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisions](docs/DECISIONS.md)
