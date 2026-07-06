# CLAUDE.md — standing instructions for Claude Code

This project is **Lugatic**, an MV3 cross-browser (Chrome + Firefox) dictionary extension.

## Source of truth
- `PLAN.md` is the source of truth for architecture, decisions, and milestones. Follow it.
- Work milestone by milestone (v0.1 → v0.5 → v1.0). Do not start later-milestone features early.
- If something in PLAN.md turns out to be wrong or impossible, say so and propose an update
  to PLAN.md before coding around it.

## Working style — I am a beginner
- Explain git commands as you run them, briefly (one line each). I'm learning the workflow.
- One feature branch per task: `feature/<short-name>`, then commit, push, and tell me when
  a PR should be opened.
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`).
- Prefer small, reviewable changes over big rewrites. Summarize what changed after each task.

## Technical guardrails
- Manifest V3 only. Use `webextension-polyfill` — never raw `chrome.*` calls in shared code.
- Bubble UI must live in a Shadow DOM. Keep the original Dictionary Anywhere look and feel.
- All persistent state in IndexedDB / storage APIs — never in service-worker globals
  (MV3 workers sleep).
- Keep everything language-keyed (`lang: "en"`) per PLAN.md §5 multi-language readiness.
- No analytics, no telemetry, no external requests except dictionaryapi.dev and the
  dataset download from GitHub Releases.
- License is GPL-3.0; keep ATTRIBUTION.md updated when adding any data source or library.
