# Lugatic data pipeline

Builds the offline dictionary dataset (PLAN.md §5). Runs in Docker for
reproducibility; not shipped in the extension.

**Status: slice 1** — pinned source downloads + WordNet-only parse.
Still to come: Wiktionary parsing, frequency filtering, merging, the
inflection→lemma table, and GitHub Release upload.

## Pinned sources

| Source | Version | Size | License |
|---|---|---|---|
| [Open English WordNet](https://github.com/globalwordnet/english-wordnet) | 2025 edition, JSON format | ~10 MB | CC BY 4.0 |
| [Wiktionary via Wiktextract](https://kaikki.org/dictionary/English/) | rolling snapshot, pinned by checksum (currently 2026-06-28) | ~470 MB | CC BY-SA / GFDL |

Pins live in `checksums.sha256`. kaikki.org only serves a rolling "latest"
file, so its pin is the committed SHA-256: when upstream updates, the
download step fails on the mismatch instead of silently building from
different data.

## Running

```bash
cd data-pipeline
docker build -t lugatic-pipeline .
docker run --rm \
  -v "$PWD/sources:/pipeline/sources" \
  -v "$PWD/build:/pipeline/build" \
  lugatic-pipeline
```

Without Docker (needs bash, curl, sha256sum, node ≥ 20, and unzip or python3):

```bash
./download.sh && node parse-wordnet.mjs
```

Outputs land in `build/`:
- `dataset-en.json` — array of `{ word, lang, phonetic?, entries: [{ pos, senses: [{ definition, example? }] }] }` (PLAN.md §3 shape)
- `dataset-en.json.gz` — what the extension will eventually download

The parse step prints word/entry/sense counts and the gzipped size against
the 20–35 MB merged-dataset budget.

## Re-pinning a source

1. Delete the stale file from `sources/` and run `./download.sh` — the
   checksum check will fail; that is the point.
2. Inspect the freshly downloaded file (spot-check a few entries).
3. Update its line in `checksums.sha256` (`sha256sum sources/<file>`),
   update the snapshot date above, and commit both with a note on why.
