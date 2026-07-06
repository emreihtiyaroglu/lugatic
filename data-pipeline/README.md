# Lugatic data pipeline

Builds the offline dictionary dataset (PLAN.md §5). Runs in Docker for
reproducibility; the pipeline itself is not shipped in the extension —
its outputs are bundled into the extension package.

**Status: slices 1–2 done** — pinned downloads, WordNet parse, lemma
exception table. Still to come: bundling the outputs into the extension
(extension-side task, not pipeline).

## Pinned sources

| Source | Version | Size | License | Role |
|---|---|---|---|---|
| [Open English WordNet](https://github.com/globalwordnet/english-wordnet) | 2025 edition, JSON format | ~10 MB | CC BY 4.0 | sole build-time source |
| [Wiktionary via Wiktextract](https://kaikki.org/dictionary/English/) | rolling snapshot, pinned by checksum (currently 2026-06-28) | ~470 MB | CC BY-SA / GFDL | **optional** — fallback + v2 full pack |

Pins live in `checksums.sha256`. kaikki.org only serves a rolling "latest"
file, so its pin is the committed SHA-256: when upstream updates, the
download step fails on the mismatch instead of silently building from
different data. The Wiktionary snapshot is skipped by default (PLAN.md §5:
WordNet-only dataset); fetch it with `--with-wiktionary` when needed.

## Running

```bash
cd data-pipeline
docker build -t lugatic-pipeline .
mkdir -p sources build   # pre-create: if Docker creates a missing mount dir,
                         # it is root-owned and the uid-1000 container can't write
docker run --rm \
  -v "$PWD/sources:/pipeline/sources" \
  -v "$PWD/build:/pipeline/build" \
  lugatic-pipeline
```

Without Docker (needs bash, curl, sha256sum, node ≥ 20, and unzip or python3):

```bash
./download.sh && node parse-wordnet.mjs
```

Outputs land in `build/` (each with a `.gz` sibling — the bundled form):
- `dataset-en.json` — array of `{ word, lang, phonetic?, entries: [{ pos, senses: [{ definition, example? }] }] }` (PLAN.md §3 shape)
- `lemmas-en.json` — irregular-form exception table `{ lang, forms: { "geese": [{ lemma, pos }] } }`;
  regular inflections are resolved at runtime by Morphy-style suffix rules

The parse step prints word/entry/sense/form counts and gzipped sizes
against the ~6 MB bundled-dataset target.

## Re-pinning a source

1. Delete the stale file from `sources/` and run `./download.sh` (with
   `--with-wiktionary` for the kaikki file) — the checksum check will
   fail; that is the point.
2. Inspect the freshly downloaded file (spot-check a few entries).
3. Update its line in `checksums.sha256` (`sha256sum sources/<file>`),
   update the snapshot date above, and commit both with a note on why.
