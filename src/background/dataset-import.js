// Bundled-dataset import (PLAN.md §5): on install/update — and on every
// service-worker start, because MV3 workers can be killed mid-import and
// onInstalled will not re-fire — compare the imported version in IndexedDB
// against the bundled manifest and (re)import on mismatch. importedVersion
// is only written after the last batch, so a half-finished import never
// claims readiness and lookups keep using the web fallback meanwhile.

const DATASET_MANIFEST_URL = "/assets/data/dataset-manifest.json";
const DATASET_URL = "/assets/data/dataset-en.json.gz";
const LEMMAS_URL = "/assets/data/lemmas-en.json.gz";
const IMPORT_BATCH_SIZE = 5000;

function toBatches (items, size) {
    const batches = [];
    for (let start = 0; start < items.length; start += size) {
        batches.push(items.slice(start, start + size));
    }
    return batches;
}

function isImported (meta, manifest) {
    return !!(meta && manifest && meta.importedVersion === manifest.version);
}

function fetchBundled (url, gzipped) {
    return fetch(browser.runtime.getURL(url)).then((response) => {
        if (gzipped) {
            const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
            return new Response(stream).json();
        }
        return response.json();
    });
}

async function importDataset (manifest) {
    const records = await fetchBundled(DATASET_URL, true);
    const lemmas = await fetchBundled(LEMMAS_URL, true);
    const lemmaRecords = Object.entries(lemmas.forms).map(([form, candidates]) => ({
        lang: lemmas.lang,
        form: form,
        candidates: candidates
    }));

    const total = records.length + lemmaRecords.length;
    let done = 0;

    // Clearing importedVersion first: during a re-import the store briefly
    // mixes old and new records, so readiness must report false throughout.
    await lugaticDb.putMeta({ lang: manifest.lang, importedVersion: null, progress: { done, total } });

    for (const batch of toBatches(records, IMPORT_BATCH_SIZE)) {
        await lugaticDb.bulkPut("definitions", batch);
        done += batch.length;
        await lugaticDb.putMeta({ lang: manifest.lang, importedVersion: null, progress: { done, total } });
    }
    for (const batch of toBatches(lemmaRecords, IMPORT_BATCH_SIZE)) {
        await lugaticDb.bulkPut("lemmas", batch);
        done += batch.length;
        await lugaticDb.putMeta({ lang: manifest.lang, importedVersion: null, progress: { done, total } });
    }

    await lugaticDb.putMeta({
        lang: manifest.lang,
        importedVersion: manifest.version,
        words: records.length,
        forms: lemmaRecords.length,
        importedAt: Date.now(),
        progress: null
    });
}

let importInFlight = null;

function runImport (force) {
    importInFlight = importInFlight || fetchBundled(DATASET_MANIFEST_URL, false)
        .then(async (manifest) => {
            const meta = await lugaticDb.getMeta(manifest.lang);
            if (!force && isImported(meta, manifest)) { return; }
            await importDataset(manifest);
        })
        .catch((error) => {
            console.error("dataset import failed:", error);
        })
        .finally(() => { importInFlight = null; });

    return importInFlight;
}

if (typeof browser !== "undefined" && browser.runtime && browser.runtime.onInstalled) {
    browser.runtime.onInstalled.addListener(() => { runImport(false); });

    browser.runtime.onMessage.addListener((request) => {
        if (!request || request.type !== "reimport-dataset") { return; }

        runImport(true);
        return Promise.resolve({ started: true });
    });

    // Self-heal on every worker start (missed onInstalled, interrupted import).
    runImport(false);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { toBatches, isImported };
}
