#!/usr/bin/env node
// Copies pipeline outputs into the extension bundle (assets/data/) and writes
// dataset-manifest.json. The manifest version is content-derived (first 12 hex
// chars of the dataset gz's SHA-256): new bytes → new version → the extension
// re-imports on its next update, with no version number to remember to bump.
// Run manually after a pipeline build: npm run bundle-dataset
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(here, "build");
const bundleDir = path.join(here, "..", "assets", "data");

const datasetGz = readFileSync(path.join(buildDir, "dataset-en.json.gz"));
const lemmasGz = readFileSync(path.join(buildDir, "lemmas-en.json.gz"));

const dataset = JSON.parse(gunzipSync(datasetGz).toString("utf8"));
const lemmas = JSON.parse(gunzipSync(lemmasGz).toString("utf8"));

const manifest = {
    lang: "en",
    version: createHash("sha256").update(datasetGz).digest("hex").slice(0, 12),
    words: dataset.length,
    forms: Object.keys(lemmas.forms).length,
    source: "Open English WordNet 2025"
};

mkdirSync(bundleDir, { recursive: true });
copyFileSync(path.join(buildDir, "dataset-en.json.gz"), path.join(bundleDir, "dataset-en.json.gz"));
copyFileSync(path.join(buildDir, "lemmas-en.json.gz"), path.join(bundleDir, "lemmas-en.json.gz"));
writeFileSync(path.join(bundleDir, "dataset-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log("bundled into assets/data/:");
console.log(JSON.stringify(manifest, null, 2));
