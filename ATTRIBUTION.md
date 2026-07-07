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

- The Lugatic icon (`assets/icons/lugatic.svg` and the PNGs derived from it)
  is original work created for this project, licensed GPL-3.0 with the rest
  of the repository.

## Data sources

- **[dictionaryapi.dev](https://dictionaryapi.dev/)** (Free Dictionary API)
  by meetDeveloper — community-run, GPL-3.0.
  Online definition lookups and pronunciation audio. Only the looked-up word
  is sent; see the privacy statement. Audio files it serves may carry their
  own licenses (e.g. CC BY-SA from Wikimedia Commons).

- **[Open English WordNet](https://github.com/globalwordnet/english-wordnet)**
  (2025 edition) — CC BY 4.0.
  Base layer of the offline dataset built by `data-pipeline/`: definitions,
  examples, and pronunciations.

Planned for later milestones (will be added here when actually used):
Wiktionary via Wiktextract (kaikki.org, CC BY-SA / GFDL) — its snapshot is
already fetched and checksum-pinned by the pipeline, but not yet parsed
into the dataset.
