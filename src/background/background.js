// Chrome (MV3) runs this file as a service worker and ignores the manifest's
// background.scripts list, so the polyfill must be imported here; Firefox runs
// an event page where importScripts does not exist and the manifest list applies.
if (typeof importScripts === "function") {
    importScripts(
        "/src/shared/browser-polyfill.js",
        "/src/shared/normalization.js",
        "/src/shared/sense-ranking.js"
    );
}

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries',

    DEFAULT_HISTORY_SETTING = {
        enabled: true
    };

browser.runtime.onMessage.addListener((request) => {
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

    return fetch(`${DICTIONARY_API_URL}/${lang}/${encodeURIComponent(query)}`)
        .then((response) => response.ok ? response.json() : null)
        .then((entries) => entries && extractContent(entries))
        .catch(() => null);
}

function extractContent (entries) {
    const entry = entries[0];
    if (!entry) { return null; }

    const senses = senseRanking.rankMeanings(entry.meanings || [], entry.word)
        .map((group) => ({
            pos: group.pos,
            senses: group.senses.map((sense) => ({
                definition: capitalize(sense.definition),
                example: sense.example
            }))
        }));

    if (!senses.length) { return null; }

    const phonetics = (entry.phonetics || []).find((phonetic) => phonetic.audio);

    return {
        word: entry.word,
        // Single-string summary kept for history storage.
        meaning: senses[0].senses[0].definition,
        senses: senses,
        audioSrc: (phonetics && phonetics.audio) || null
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
