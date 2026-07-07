// Chrome (MV3) runs this file as a service worker and ignores the manifest's
// background.scripts list, so the polyfill must be imported here; Firefox runs
// an event page where importScripts does not exist and the manifest list applies.
if (typeof importScripts === "function") {
    importScripts(
        "/src/shared/browser-polyfill.js",
        "/src/shared/normalization.js",
        "/src/shared/sense-ranking.js",
        "/src/shared/lemmatize.js",
        "/src/shared/db.js",
        "/src/background/dataset-import.js"
    );
}

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries',

    DEFAULT_HISTORY_SETTING = {
        enabled: true
    };

browser.runtime.onMessage.addListener((request) => {
    // Typed messages (e.g. reimport-dataset) belong to other listeners.
    if (!request || typeof request.word !== "string") { return; }

    const { word, lang } = request;

    return lookup(word, lang).then((content) => {
        content && browser.storage.local.get().then((results) => {
            let history = results.history || DEFAULT_HISTORY_SETTING;

            history.enabled && saveWord(content)
        });

        return { content };
    });
});

function lookup (word, lang) {
    const query = normalization.normalizeWord(word);

    if (!query) { return Promise.resolve(null); }

    // Waterfall (PLAN.md §3): local dataset (direct, then lemmatized) →
    // dictionaryapi.dev. Local is skipped entirely until import completes.
    return localLookup(query, lang)
        .catch(() => null)
        .then((content) => content || webLookup(query, lang));
}

async function localLookup (word, lang) {
    if (!await datasetReady(lang)) { return null; }

    const record = await lugaticDb.getDefinition(lang, word)
        || await lemmaLookup(word, lang);

    if (!record) { return null; }

    const meanings = record.entries.map((entry) => ({
        partOfSpeech: entry.pos,
        definitions: entry.senses
    }));

    return buildContent(record.word, meanings, null, "local");
}

// Irregulars from the imported OEWN exception table first ("geese" →
// goose), then Morphy suffix rules ("researchers" → researcher); the
// first candidate present in the dataset wins.
async function lemmaLookup (word, lang) {
    const exception = await lugaticDb.getLemma(lang, word);
    const candidates = (exception ? exception.candidates.map((c) => c.lemma) : [])
        .concat(lemmatize.morphyCandidates(word))
        .filter((candidate, index, all) => all.indexOf(candidate) === index);

    for (const candidate of candidates) {
        const record = await lugaticDb.getDefinition(lang, candidate);
        if (record) { return record; }
    }

    return null;
}

function webLookup (word, lang) {
    return fetch(`${DICTIONARY_API_URL}/${lang}/${encodeURIComponent(word)}`)
        .then((response) => response.ok ? response.json() : null)
        .then((entries) => entries && extractContent(entries))
        .catch(() => null);
}

function extractContent (entries) {
    const entry = entries[0];
    if (!entry) { return null; }

    const phonetics = (entry.phonetics || []).find((phonetic) => phonetic.audio);

    return buildContent(
        entry.word,
        entry.meanings || [],
        (phonetics && phonetics.audio) || null,
        "web"
    );
}

function buildContent (word, meanings, audioSrc, source) {
    const senses = senseRanking.rankMeanings(meanings, word)
        .map((group) => ({
            pos: group.pos,
            senses: group.senses.map((sense) => ({
                definition: capitalize(sense.definition),
                example: sense.example
            }))
        }));

    if (!senses.length) { return null; }

    return {
        word: word,
        // Single-string summary kept for history storage.
        meaning: senses[0].senses[0].definition,
        senses: senses,
        audioSrc: audioSrc,
        source: source
    };
}

function capitalize (text) {
    return text ? text[0].toUpperCase() + text.substring(1) : text;
}

function saveWord (content) {
    let word = content.word,
        meaning = content.meaning,

        storageItem = browser.storage.local.get('definitions');

        storageItem.then((results) => {
            let definitions = results.definitions || {};

            definitions[word] = meaning;
            browser.storage.local.set({
                definitions
            });
        })
}
