# Lugatic

[![CI](https://github.com/emreihtiyaroglu/lugatic/actions/workflows/ci.yml/badge.svg)](https://github.com/emreihtiyaroglu/lugatic/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/emreihtiyaroglu/lugatic?include_prereleases)](https://github.com/emreihtiyaroglu/lugatic/releases)

A lightweight, high-coverage dictionary browser extension for Chrome and Firefox.
Select a word anywhere on the web and get an instant definition in a small in-page
bubble — offline-first, with automatic online fallback and one-click AI context
explanation.

Lugatic is a fork of
[Dictionary Anywhere](https://github.com/meetDeveloper/Dictionary-Anywhere),
rebuilt with a real dictionary API and an offline database instead of
Google-results scraping. See [ATTRIBUTION.md](ATTRIBUTION.md) for all credits.

## Status

🚧 Early development — milestone **v0.1** in progress. Not yet functional; the
lookup backend is being replaced. See [PLAN.md](PLAN.md) for the full
architecture, roadmap, and milestones.

## Known limitations

- Lookups cannot work on browser-internal and extension pages
  (`chrome://…`, `about:…`, `edge://…`, other extensions' pages, and the
  browsers' add-on stores): browsers do not inject content scripts into
  privileged pages. The full list of limitations lives in PLAN.md §10.

## License

[GPL-3.0](LICENSE), as inherited from the Dictionary Anywhere fork.
