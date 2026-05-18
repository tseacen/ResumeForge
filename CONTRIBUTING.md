# Contributing to ResumeForge

Thanks for contributing.

ResumeForge is a local-first CV tailoring app. The project priority is correctness, traceability, and user trust.

## Before You Start

- Read [README.md](README.md) for architecture and current product direction.
- Keep contributions focused and small when possible.
- Open an issue for large changes before implementing.

## Critical Product Rule

Never invent resume facts.

Do not introduce logic that fabricates:

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

Only use facts supported by the source CV or explicitly validated by the user.

## Tech Stack

- Next.js + React + TypeScript
- Tailwind CSS v4
- Tauri v2
- Zod
- pnpm
- Vitest

## Local Setup

1. Install Node.js 22+ and pnpm.
2. Install dependencies:

```bash
pnpm install
```

3. Run the web app:

```bash
pnpm dev
```

4. Run the desktop shell:

```bash
pnpm tauri:dev
```

## Development Guidelines

- Keep parsing/scoring deterministic and separate from LLM rewriting.
- Use Zod schemas for structured data contracts.
- Validate generated outputs before they are surfaced to users.
- Preserve local-first and privacy-first behavior.
- Do not add telemetry.
- Do not commit secrets.
- Avoid `any` unless unavoidable and documented.
- Avoid reintroducing removed dashboard/tabbed UI patterns unless explicitly requested.

## Tests and Quality Checks

Run these before opening a PR:

```bash
pnpm lint
pnpm test
pnpm build
```

## Branching and Pull Requests

`main` is protected by rulesets.

- Do not push directly to `main`.
- Create a branch from `main`.
- Open a pull request.
- Wait for required checks to pass.

Suggested branch names:

- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`
- `docs/<short-description>`

Suggested commit style:

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`

## PR Checklist

- Scope is clear and limited.
- Tests updated or added where behavior changes.
- Lint/test/build pass.
- No breaking changes without explanation.
- UI changes are consistent with the current ResumeForge direction.
- Resume-safety rule remains enforced.

## Reporting Issues

When opening an issue, include:

- expected behavior
- actual behavior
- reproduction steps
- environment details (OS, Node.js, pnpm)
- logs/screenshots when relevant

## Security

Do not open public issues for sensitive vulnerabilities.

Use GitHub private vulnerability reporting from the repository Security tab.
