# Lugatic — Project Plan

A lightweight, high-coverage dictionary browser extension. Select a word anywhere —
including PDFs — and get an instant definition from a local offline database, with
automatic online fallback and one-click AI context explanation.

Fork of [Dictionary Anywhere](https://github.com/meetDeveloper/Dictionary-Anywhere) (GPL-3.0),
rebuilt with a real dictionary API and an offline database instead of Google-results scraping.

---

## 1. Goals and non-goals

**Goals**
- Instant word lookup with a clean in-page bubble (preserve the original's look & feel)
- One merged result per word (no dual panels), with a small source badge (local / web)
- High coverage: merged WordNet + Wiktionary offline dataset, dictionaryapi.dev fallback
- Light and fast: small extension download, dataset fetched on first run, IndexedDB lookups
- Works on PDFs via context menu + side panel
- AI context explanation via prefilled tab to the user's chosen AI site (no API keys)
- Cross-browser: Chrome + Firefox, Manifest V3

**Non-goals (v1)**
- No multi-language dictionaries (architecture must allow it; see §6)
- No API-key AI integration (v2 candidate)
- No custom bundled PDF viewer (v2 candidate)
- No accounts, sync, telemetry, or analytics — ever, for the last three

## 2. Architecture overview

```
┌────────────────────────────── Browser ──────────────────────────────┐
│                                                                     │
│  Regular page                    PDF viewer (privileged)            │
│  ┌─────────────────────┐         ┌────────────────────┐             │
│  │ content script      │         │ (no injection      │             │
│  │ · dblclick trigger  │         │  possible)         │             │
│  │ · floating button   │         │ context menu only  │             │
│  │ · bubble UI (Shadow │         └─────────┬──────────┘             │
│  │   DOM)              │                   │ selectionText          │
│  └─────────┬───────────┘                   │                        │
│            │ runtime message               │                        │
│  ┌─────────▼───────────────────────────────▼──────────┐             │
│  │ background service worker                          │             │
│  │  lookup(word, context):                            │             │
│  │   1. normalize (strip punct., lowercase, lemma)    │             │
│  │   2. IndexedDB query (merged offline dataset)      │             │
│  │   3. if miss/thin → fetch dictionaryapi.dev        │             │
│  │   4. merge → normalized DefinitionResult           │             │
│  │   5. cache web results into IndexedDB              │             │
│  └─────────┬───────────────────────┬──────────────────┘             │
│            │                       │                                │
│     bubble render            side panel render (PDF results)        │
└─────────────────────────────────────────────────────────────────────┘
```

**Key modules**
- `src/background/` — service worker: lookup waterfall, dataset download, caching, context-menu registration
- `src/content/` — selection detection (double-click, floating button), bubble UI in Shadow DOM
- `src/sidepanel/` — result view for PDFs (Chrome sidePanel / Firefox sidebar)
- `src/options/` — settings page
- `src/shared/` — `DefinitionResult` schema, normalization, lemma mapping, storage helpers
- `data-pipeline/` — Dockerized build of the offline dataset (not shipped in the extension)

**MV3 cross-browser notes**
- Use `webextension-polyfill` so one codebase serves `chrome.*` and `browser.*`
- Manifest declares `minimum_chrome_version: "114"` (sidePanel API) and
  `browser_specific_settings.gecko` with `strict_min_version: "115.0"` and an add-on ID
- Service workers sleep after ~30s idle: all state lives in IndexedDB/storage, never in globals;
  IndexedDB connections opened per-event

## 3. Lookup waterfall (single merged result)

1. **Normalize**: trim, strip surrounding punctuation, lowercase; multi-word selection → try exact
   phrase, else first word; map inflected form → lemma via bundled inflection table
2. **Local**: query IndexedDB `definitions` store → hit = render instantly, badge `local`
3. **Fallback**: miss or thin entry (no definitions for any POS) → `GET
   https://api.dictionaryapi.dev/api/v2/entries/en/{word}` → merge missing fields (pronunciation,
   audio, extra senses) into the local entry or create a new one, badge `web`
4. **Cache**: write web results into IndexedDB `cache` store (LRU cap ~10k entries) → offline next time
5. **Neither**: friendly "No definition found — Ask AI?" state with the AI button prominent

`DefinitionResult` (normalized internal format, language-aware from day one):

```json
{
  "word": "render", "lang": "en", "source": "local|web|merged",
  "phonetic": "/ˈrɛndə/", "audio": "https://…",
  "entries": [
    { "pos": "verb", "senses": [ { "definition": "…", "example": "…" } ] }
  ]
}
```

## 4. Triggers and UI

**Trigger matrix**

| Surface           | Double-click | Floating button | Context menu | Result shown in |
|-------------------|:---:|:---:|:---:|-----------------|
| Regular webpages  | ✅ | ✅ | ✅ | in-page bubble  |
| Native PDF viewer | ❌ (impossible) | ❌ (impossible) | ✅ | side panel      |

Trigger mode is a setting: double-click / floating button / both / require modifier key (Ctrl/Alt).

**Bubble spec**
- Rendered in a Shadow DOM container appended to `<body>`; positioned near the selection,
  flipping above/below to stay in the viewport
- Collapsed max height ≈ 280px: word, phonetic + 🔊, top 1–2 senses per part of speech
- **"More ▾"** expands to ≈ 520px with internal scroll for the full entry
- Footer: source badge (`local` / `web`) · ✨ AI button · settings gear
- Dismiss on outside click or Esc; keep original Dictionary Anywhere visual styling

**AI button (Option A)**
- Grabs the selection's surrounding sentence from the DOM (in the side panel/PDF case, only
  the selected text is available)
- Opens a new tab to the user-selected AI site with a prefilled query:
  `Explain the meaning of "{word}" in this context: "{sentence}"`
- Settings dropdown: Claude / ChatGPT / Perplexity (URL templates in `src/shared/ai-sites.js`)
- Disclosure in options page + README: this sends the selected text and sentence to that site

## 5. Offline dataset and pipeline

**Sources**
- Open English WordNet (latest release) — base layer, permissive license
- Wiktionary via Wiktextract JSON (kaikki.org) — filtered to a top-frequency wordlist
  (~60–80k lemmas), essentials only: definitions, POS, IPA
- Inflection → lemma table derived from the Wiktionary extract

**Pipeline** (`data-pipeline/`, runs in Docker for reproducibility)
1. Download pinned source snapshots (URLs + checksums committed)
2. Parse, filter, merge (WordNet first, Wiktionary fills gaps/adds senses), deduplicate
3. Emit `dataset-en-vX.json.gz` (~20–35 MB) + `lemmas-en-vX.json.gz`
4. Upload as assets to a GitHub Release

**Delivery**
- Extension ships ~1 MB; on first run, downloads the dataset from GitHub Releases with a
  progress indicator, decompresses, bulk-inserts into IndexedDB
- Until ready (and as permanent fallback) lookups use the web API — works from second one
- Dataset is versioned independently of the extension; background check for newer dataset
  (manual "update dataset" button in options; no silent large downloads)

**Multi-language readiness**
- Every store, file, and schema is keyed by `lang`; dataset files are per-language
  (`dataset-en-…`, later `dataset-es-…`); API layer is an adapter interface so a
  non-dictionaryapi.dev provider can back another language later

## 6. Settings (options page)

- Trigger mode (double-click / floating button / both) + optional modifier key
- AI site dropdown (Claude / ChatGPT / Perplexity) + enable/disable AI button
- History: on/off, view, clear
- Dataset: status, version, re-download, clear cache
- Language selector (en only in v1, architecture-ready)
- Storage: settings in `storage.sync` (small), dataset/cache/history in IndexedDB

## 7. Repository layout

```
lugatic/
├── README.md            # what/why, screenshots, install, known limitations
├── LICENSE              # GPL-3.0 (fork obligation)
├── ATTRIBUTION.md       # Dictionary Anywhere, Open English WordNet, Wiktionary (CC BY-SA),
│                        # dictionaryapi.dev
├── PRIVACY.md           # plain-language privacy statement (needed for store listings)
├── PLAN.md              # this file
├── manifest.json
├── src/{background,content,sidepanel,options,shared}/
├── assets/icons/        # 16/32/48/128 px from a master SVG
├── data-pipeline/       # Dockerfile + scripts + README (how to rebuild the dataset)
├── dist/                # build output (gitignored)
└── .github/workflows/ci.yml   # lint (web-ext lint + eslint) + build zips on push/PR
```

## 8. Milestones

**v0.1 — "It works" (days)**
- [ ] Fork/clone Dictionary Anywhere, strip Google scraping
- [ ] MV3 migration + webextension-polyfill; loads in Chrome and Firefox
- [ ] dictionaryapi.dev lookup wired to the existing bubble (web-only, no offline yet)
- [ ] Word normalization (punctuation, lowercase)
- [ ] Repo, README, LICENSE, ATTRIBUTION, CI lint

**v0.5 — "Hybrid" (the core)**
- [ ] Data pipeline in Docker → first `dataset-en-v1` GitHub Release
- [ ] First-run dataset download + IndexedDB import with progress UI
- [ ] Lookup waterfall + merging + caching + source badge
- [ ] Lemmatization; phrase-then-first-word selection handling
- [ ] Bubble redesign: collapsed/expanded "More ▾", footer row
- [ ] Floating selection button trigger + trigger settings

**v1.0 — "Ship it"**
- [ ] Context menu + side panel → PDF support
- [ ] AI button + AI site dropdown
- [ ] History (port from original) with clear button
- [ ] Options page complete; icons + store screenshots
- [ ] PRIVACY.md; manual test matrix pass (see §9)
- [ ] Tag v1.0.0 → GitHub Release; submit to AMO (free) and Chrome Web Store ($5 one-time)

**v2 ideas (parking lot)**: bundled PDF.js viewer for in-PDF bubbles; API-key AI integration;
Spanish/German/French datasets; Anki export of history.

## 9. Testing checklist (manual matrix)

- Chrome + Firefox: double-click, floating button, context menu on a news article
- Word forms: "running", "better", "don't", "state-of-the-art", "word," (trailing comma)
- Multi-word selection; word with no definition (AI fallback state)
- Offline mode (disable network): local hits still work; web-miss shows graceful error
- First-run: dataset download progress, interrupt/resume, lookups work during download
- PDF: selection → context menu → side panel result (Chrome and Firefox)
- Dark/light pages: bubble unreadable nowhere (Shadow DOM isolation)
- `web-ext lint` clean; extension reload survives service-worker sleep

## 10. Known limitations (documented in README)

- Native PDF viewers: context-menu lookup only (no in-page bubble) — browser restriction
- Google Docs renders text on canvas: lookups unavailable there
- Cross-origin iframes: bubble may not appear inside them
- dictionaryapi.dev is community-run: outages degrade to offline-only gracefully

## 11. Development environment (Ubuntu)

```bash
# 1. Git + GitHub
sudo apt update && sudo apt install -y git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
ssh-keygen -t ed25519 -C "you@example.com"      # then add ~/.ssh/id_ed25519.pub to GitHub
sudo apt install -y gh && gh auth login          # GitHub CLI (optional, handy)

# 2. Node.js via nvm (never apt/sudo for node)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install --lts

# 3. Extension tooling
npm install -g web-ext                           # Firefox live-reload dev + linting

# 4. Claude Code (native installer; needs Pro/Max/Team or Console account)
curl -fsSL https://claude.ai/install.sh | bash
claude doctor                                    # verify

# 5. Create the repo
gh repo create lugatic --public --clone && cd lugatic
# drop this PLAN.md in, commit, push — then work milestone by milestone

# Daily dev loop
web-ext run --source-dir=dist/firefox            # live-reload in Firefox
# Chrome: chrome://extensions → Developer mode → Load unpacked → dist/chrome
```

**Git workflow (per task)**: `git checkout -b feature/<issue-name>` → edit → `git add -A` →
`git commit -m "feat: …"` → `git push -u origin HEAD` → open PR on GitHub → merge → repeat.
Create one GitHub Issue per checklist item above; group into v0.1/v0.5/v1.0 Milestones.

## 12. Privacy statement (draft for PRIVACY.md and store listings)

> Lugatic performs all lookups locally on your device when possible. When a word is not in
> the local database, only that word is sent to dictionaryapi.dev. If you click the AI button,
> the selected text and its surrounding sentence are opened in the AI website you chose in
> settings. Lugatic collects no personal data, sets no analytics, and never sees your browsing
> history.
