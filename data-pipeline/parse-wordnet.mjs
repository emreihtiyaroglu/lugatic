#!/usr/bin/env node
// Parse step, slice 1 (PLAN.md §5): Open English WordNet JSON →
// build/dataset-en.json in the DefinitionResult-compatible shape of §3:
//   { word, lang, phonetic?, entries: [{ pos, senses: [{ definition, example? }] }] }
// Prints entry/sense counts and gzipped size to sanity-check the 20–35 MB
// budget (that budget is for the *merged* dataset; WordNet alone runs smaller).
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wordnetDir = path.join(here, "sources", "wordnet");
const buildDir = path.join(here, "build");

const POS_NAMES = {
    n: "noun",
    v: "verb",
    a: "adjective",
    s: "adjective", // satellite adjectives collapse into plain adjectives
    r: "adverb"
};

const started = Date.now();
const files = readdirSync(wordnetDir);

// Synset files (noun.*, verb.*, adj.*, adv.*) carry definitions and examples.
const synsets = new Map();
for (const file of files.filter((f) => /^(noun|verb|adj|adv)\./.test(f))) {
    const data = JSON.parse(readFileSync(path.join(wordnetDir, file), "utf8"));

    for (const [id, synset] of Object.entries(data)) {
        const definition = synset.definition && synset.definition[0];
        if (!definition) { continue; }

        const example = (synset.example || [])
            .map((e) => (typeof e === "string" ? e : e && e.text))
            .find(Boolean);

        synsets.set(id, { definition, example: example || null });
    }
}

// Entry files (entries-*.json) map lemma → POS block → ordered sense list.
const records = [];
const unknownPos = new Map();
let senseCount = 0;

for (const file of files.filter((f) => /^entries-/.test(f)).sort()) {
    const data = JSON.parse(readFileSync(path.join(wordnetDir, file), "utf8"));

    for (const [lemma, posBlocks] of Object.entries(data)) {
        // Homographs get suffixed codes ("agora" → "n-1", "n-2"); the base
        // code before the dash is the POS, and same-POS senses merge in order.
        const sensesByPos = new Map();
        let phonetic = null;

        for (const [code, block] of Object.entries(posBlocks)) {
            const baseCode = code.split("-")[0];
            const pos = POS_NAMES[baseCode];
            if (!pos) {
                unknownPos.set(baseCode, (unknownPos.get(baseCode) || 0) + 1);
            }

            if (!phonetic && block.pronunciation && block.pronunciation[0]) {
                phonetic = `/${block.pronunciation[0].value}/`;
            }

            const senses = (block.sense || [])
                .map((sense) => synsets.get(sense.synset))
                .filter(Boolean)
                .map((synset) => ({
                    definition: synset.definition,
                    ...(synset.example ? { example: synset.example } : {})
                }));

            if (senses.length) {
                senseCount += senses.length;
                const key = pos || baseCode;
                sensesByPos.set(key, (sensesByPos.get(key) || []).concat(senses));
            }
        }

        const entries = [...sensesByPos].map(([pos, senses]) => ({ pos, senses }));

        if (entries.length) {
            records.push({
                word: lemma,
                lang: "en",
                ...(phonetic ? { phonetic } : {}),
                entries
            });
        }
    }
}

records.sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));

mkdirSync(buildDir, { recursive: true });
const json = JSON.stringify(records);
writeFileSync(path.join(buildDir, "dataset-en.json"), json);
const gzipped = gzipSync(json, { level: 9 });
writeFileSync(path.join(buildDir, "dataset-en.json.gz"), gzipped);

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " MB";
console.log("dataset-en.json written");
console.log(`  words:       ${records.length}`);
console.log(`  entries:     ${records.reduce((n, r) => n + r.entries.length, 0)}`);
console.log(`  senses:      ${senseCount}`);
console.log(`  synsets:     ${synsets.size}`);
console.log(`  raw size:    ${mb(json.length)}`);
console.log(`  gzip -9:     ${mb(gzipped.length)}  (merged-dataset budget: 20-35 MB)`);
if (unknownPos.size) {
    console.log(`  unmapped POS codes kept as-is: ${JSON.stringify(Object.fromEntries(unknownPos))}`);
}
console.log(`  took:        ${((Date.now() - started) / 1000).toFixed(1)}s`);
