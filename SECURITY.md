# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Use [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) from the repository Security tab.

Include:

- a description of the vulnerability
- steps to reproduce
- potential impact
- your suggested fix if any

We aim to acknowledge reports within 72 hours and provide a fix or mitigation plan within 14 days for confirmed vulnerabilities.

## Scope

ResumeForge is a local-first desktop application. The main attack surface is:

- **LLM provider calls** — API keys are stored locally and never sent to any server other than the configured provider.
- **Resume HTML parsing** — user-supplied HTML is parsed by Cheerio server-side; it is never injected into the DOM without sanitization.
- **Local storage** — session data is persisted in `localStorage`; no remote database is involved.
- **Tauri shell** — the desktop wrapper uses Tauri v2; CSP and capability configuration follow Tauri security guidelines.

## Out of Scope

- Vulnerabilities in third-party dependencies (report those upstream).
- Issues requiring physical access to the user's machine.
- Social engineering attacks.
