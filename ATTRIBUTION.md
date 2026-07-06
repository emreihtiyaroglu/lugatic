# Attribution

Lugatic builds on the work of others. This file lists every data source and
library used, per project policy (see CLAUDE.md).

## Code

- **[Dictionary Anywhere](https://github.com/meetDeveloper/Dictionary-Anywhere)**
  by Suraj Jain — GPL-3.0.
  Lugatic is a fork: the content script, in-page bubble UI and styling, and the
  options page originate from this project. The Google-results scraping backend
  was removed and is being replaced.

- **[webextension-polyfill](https://github.com/mozilla/webextension-polyfill)**
  by Mozilla — MPL-2.0.
  Bundled as `src/shared/browser-polyfill.js` so one codebase serves both
  `chrome.*` and `browser.*` APIs.

## Icons

- The extension icons in `assets/icons/` are the original Dictionary Anywhere
  icons (GPL-3.0), kept as **temporary development placeholders only**. They
  must be replaced with Lugatic's own icons before any store release
  (PLAN.md, v1.0 milestone).

## Data sources

- **[dictionaryapi.dev](https://dictionaryapi.dev/)** (Free Dictionary API)
  by meetDeveloper — community-run, GPL-3.0.
  Online definition lookups and pronunciation audio. Only the looked-up word
  is sent; see the privacy statement. Audio files it serves may carry their
  own licenses (e.g. CC BY-SA from Wikimedia Commons).

Planned for later milestones (will be added here when actually used):
Open English WordNet and Wiktionary via Wiktextract (kaikki.org, CC BY-SA).
