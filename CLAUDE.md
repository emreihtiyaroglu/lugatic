# CLAUDE.md — standing instructions for Claude Code

This project is **Lugatic**, an MV3 cross-browser (Chrome + Firefox) dictionary extension.

## Source of truth
- `PLAN.md` is the source of truth for architecture, decisions, and milestones. Follow it.
- Work milestone by milestone (v0.1 → v0.5 → v1.0). Do not start later-milestone features early.
- If something in PLAN.md turns out to be wrong or impossible, say so and propose an update
  to PLAN.md before coding around it.

## Working style — I am a beginner
- Explain git commands as you run them, briefly (one line each). I'm learning the workflow.
- One feature branch per task: `feature/<short-name>`, then commit, push, and follow the
  autonomous merge workflow below.
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`).
- Prefer small, reviewable changes over big rewrites. Summarize what changed after each task.

## Autonomous merge workflow (approved 2026-07-07)
- After pushing a branch, open the PR yourself (`gh pr create`) with a summary-quality
  description, then enable auto-merge (`gh pr merge --auto --merge`).
- One branch at a time, from up-to-date main, strictly sequential — never stack branches
  and never open a second PR while one is pending (auto-merge + racing branches stall on
  the up-to-date rule).
- STOP and request explicit approval instead of auto-merging for: PLAN.md amendments,
  manifest.json permission or version changes, anything touching privacy/data handling,
  dependency additions, and store-submission steps.
- After each merge, post a short summary readable asynchronously.

## Technical guardrails
- Manifest V3 only. Use `webextension-polyfill` — never raw `chrome.*` calls in shared code.
- Bubble UI must live in a Shadow DOM. Keep the original Dictionary Anywhere look and feel.
- All persistent state in IndexedDB / storage APIs — never in service-worker globals
  (MV3 workers sleep).
- Keep everything language-keyed (`lang: "en"`) per PLAN.md §5 multi-language readiness.
- No analytics, no telemetry, no external requests except dictionaryapi.dev and the
  dataset download from GitHub Releases.
- License is GPL-3.0; keep ATTRIBUTION.md updated when adding any data source or library.
- Full local verification before any push: eslint + tests + web-ext lint + build — never a subset.

## Environment & testing notes (WSL2 — hard-won, read before E2E work)
- The shell's working directory can reset between commands; always use absolute paths,
  especially for Docker volume mounts (a wrong `$PWD` mount once looked like data loss).
- Docker (Desktop + WSL integration): pre-create host dirs before mounting
  (`mkdir -p sources build`) — Docker creates missing mount dirs as root and the uid-1000
  pipeline container then can't write into them.
- E2E harness = puppeteer + headless Chrome; it lives in the session scratchpad (/tmp), so
  it is gone after a session reset. Rebuild recipe:
  1. `npm install puppeteer`; if its Chrome download fails, delete the half-extracted
     `~/.cache/puppeteer/chrome/<ver>` dir, install with `PUPPETEER_SKIP_DOWNLOAD=1`, then
     fetch the zip yourself and extract with `python3 -m zipfile -e` into that cache path.
  2. This distro lacks Chrome's libs (libnspr4, libnss3, libasound2t64). No sudo needed:
     `apt-get download` them, `dpkg -x` into a folder, run Chrome with
     `LD_LIBRARY_PATH=<folder>/usr/lib/x86_64-linux-gnu`.
  3. Launch: `--load-extension=<repo> --disable-extensions-except=<repo> --no-sandbox`,
     and `protocolTimeout` ≥ your longest wait (default 180 s dies on slow imports).
- Puppeteer gotchas (each cost real debugging time):
  - Headless Chrome does not word-select on synthetic double-clicks: set the selection via
    a Range first, then dispatch the `dblclick` MouseEvent.
  - CDP `click()`/`select()` stall forever on a backgrounded extension tab: `bringToFront()`
    first, or click via `page.evaluate(() => el.click())`.
  - Content scripts don't run on `data:` URLs — serve test pages over a local http server.
  - Extension pages can't load `file://` subresources — inline SVG/HTML into the page.
- Useful test facts: fresh IndexedDB import ≈ 39 MB (Chrome's extension-size display can
  transiently show far more before LevelDB compaction — 667 MB observed, harmless);
  "selfie" is absent from WordNet 2025 but present in dictionaryapi.dev — forces the
  web/cache path.
- `web-ext lint` baseline is exactly 1 warning (Firefox ignoring background.service_worker;
  intended). Any new warning is a regression; addons-linter flags every innerHTML
  assignment, even of static strings — build DOM nodes instead.
- `npm test` output is ANSI-colored; grep for plain substrings, not line anchors.
- package.json stays at version 0.1.0 deliberately; manifest.json is the version of record.
- The icons' master SVG is `assets/icons/lugatic.svg`; PNGs are exported from it via
  headless Chrome screenshots (`omitBackground: true`), not ImageMagick (not installed).
