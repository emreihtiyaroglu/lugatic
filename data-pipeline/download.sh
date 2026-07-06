#!/usr/bin/env bash
# Download step: fetch the pinned source snapshots into sources/ and verify
# them against checksums.sha256. Fails loudly on any mismatch — see README
# ("Re-pinning") before touching the checksums.
set -euo pipefail
cd "$(dirname "$0")"

# Open English WordNet 2025 edition, native JSON format (CC BY 4.0).
WORDNET_URL="https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025-json.zip"

# kaikki.org serves a ROLLING latest snapshot — there is no stable dated URL,
# so the pin is this URL plus the committed SHA-256. When upstream updates,
# the checksum check below is what fails.
KAIKKI_URL="https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz"

mkdir -p sources

fetch () {
    local url="$1" file="sources/$(basename "$1")"

    if [ -f "$file" ]; then
        echo "exists, skipping download: $file"
    else
        echo "downloading: $url"
        curl -fSL --retry 3 -o "$file" "$url"
    fi
}

WITH_WIKTIONARY="${WITH_WIKTIONARY:-0}"
for arg in "$@"; do
    [ "$arg" = "--with-wiktionary" ] && WITH_WIKTIONARY=1
done

fetch "$WORDNET_URL"
if [ "$WITH_WIKTIONARY" = "1" ]; then
    fetch "$KAIKKI_URL"
else
    echo "skipping Wiktionary snapshot (optional since PLAN.md §5 rewrite;"
    echo "  pass --with-wiktionary or set WITH_WIKTIONARY=1 to fetch it)"
fi

echo "verifying checksums..."
# --ignore-missing: the Wiktionary snapshot is optional, but anything
# present must match its pin. The WordNet zip is mandatory.
(cd sources && sha256sum -c --ignore-missing ../checksums.sha256)
[ -f "sources/$(basename "$WORDNET_URL")" ]

if [ ! -d sources/wordnet ]; then
    echo "extracting WordNet..."
    if command -v unzip >/dev/null; then
        unzip -q "sources/$(basename "$WORDNET_URL")" -d sources/wordnet
    else
        python3 -m zipfile -e "sources/$(basename "$WORDNET_URL")" sources/wordnet
    fi
fi

echo "sources ready."
