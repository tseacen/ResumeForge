# Decisions

## 1. ResumeForge v2 Mockup Is The UI Source Of Truth

The active UI should match the `ResumeForge-2.zip` direction.

This means:

- warm cream background
- terracotta accent
- compact Claude-style cards
- fixed sidebar
- compact topbar
- chat-first flow
- right-side CV preview

Avoid drifting back to the previous generic dashboard.

## 2. No shadcn Runtime Components In Current UI

The current implementation removed:

- `apps/web/src/components/ui/*`
- `components.json`
- `@base-ui/react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `tw-animate-css`
- `shadcn`

Reason:

- the v2 mockup uses a bespoke product interface
- unused generated primitives added dependency and maintenance weight
- Tailwind utilities are now preferred for active component styling
- minimal global CSS keeps tokens, animations, and CV paper/diff behavior centralized

This can be revisited if the product later needs a broader reusable design system.

## 3. Deterministic Engine Stays Separate From Product Shell

Parsing, scoring, tailoring, and audit logic stay in `apps/web/src/lib`.

The UI/session layer in `apps/web/src/lib/resumeforge` adapts deterministic outputs into the chat and preview experience.

Reason:

- easier testing
- safer anti-hallucination guarantees
- provider-independent architecture

## 4. Local-First Persistence First

The current app uses browser localStorage through `apps/web/src/lib/resumeforge/storage.ts`.

Reason:

- fast POC iteration
- no backend dependency
- privacy-first default

Future desktop builds can move to Tauri local file storage if needed.

## 5. Claude Code And Codex Are Visual Provider Options

The setup mockup shows Claude Code and OpenAI Codex provider cards.

The deterministic fallback remains available in logic, but it should not visually distort the setup layout unless the user asks for it.

## 6. Truthfulness Beats Polish

No UI or LLM improvement can bypass the core rule:

Never invent resume facts.

Unsupported claims must be blocked or marked for user validation.
