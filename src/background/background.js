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
    // permanent web-result cache → dictionaryapi.dev. Local is skipped
    // until import completes; the cache works regardless.
    return localLookup(query, lang)
        .catch(() => null)
        .then((content) => content || cachedLookup(query, lang))
        .then((content) => content
            || webLookup(query, lang).then((webContent) => cacheResult(query, lang, webContent)));
}

function cachedLookup (word, lang) {
    return lugaticDb.getCached(lang, word)
        .then((entry) => (entry ? entry.content : null))
        .catch(() => null);
}

// Permanent by design (§3): no eviction — growth is bounded by words the
// user actually looks up. Manual clear lives in the options page. Misses
// are not cached so an API outage never sticks.
function cacheResult (word, lang, content) {
    if (content) {
        lugaticDb.putCached({
            lang: lang,
            word: word,
            content: content,
            cachedAt: Date.now()
        }).catch(() => {});
    }
    return content;
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

    return buildContent(record.word, meanings, null, "local", record.phonetic || null);
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

    const withAudio = (entry.phonetics || []).find((phonetic) => phonetic.audio);
    const withText = (entry.phonetics || []).find((phonetic) => phonetic.text);

    return buildContent(
        entry.word,
        entry.meanings || [],
        (withAudio && withAudio.audio) || null,
        "web",
        entry.phonetic || (withText && withText.text) || null
    );
}

function buildContent (word, meanings, audioSrc, source, phonetic) {
    // Trimmed senses for the collapsed bubble, the full ranked entry for
    // the expanded "More ▾" view (PLAN.md §4).
    const senses = presentGroups(senseRanking.rankMeanings(meanings, word));
    const fullSenses = presentGroups(senseRanking.rankMeanings(meanings, word, Infinity));

    if (!senses.length) { return null; }

    return {
        word: word,
        phonetic: phonetic || null,
        // Single-string summary kept for history storage.
        meaning: senses[0].senses[0].definition,
        senses: senses,
        fullSenses: fullSenses,
        audioSrc: audioSrc,
        source: source
    };
}

function presentGroups (groups) {
    return groups.map((group) => ({
        pos: group.pos,
        senses: group.senses.map((sense) => ({
            definition: capitalize(sense.definition),
            example: sense.example
        }))
    }));
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
