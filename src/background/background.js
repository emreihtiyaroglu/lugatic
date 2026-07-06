// Chrome (MV3) runs this file as a service worker and ignores the manifest's
// background.scripts list, so the polyfill must be imported here; Firefox runs
// an event page where importScripts does not exist and the manifest list applies.
if (typeof importScripts === "function") {
    importScripts("/src/shared/browser-polyfill.js");
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
    // TODO(v0.1): only trims for now — punctuation stripping and lowercasing
    // land with the word-normalization task (PLAN.md §3 step 1).
    const query = encodeURIComponent(word.trim());

    return fetch(`${DICTIONARY_API_URL}/${lang}/${query}`)
        .then((response) => response.ok ? response.json() : null)
        .then((entries) => entries && extractContent(entries))
        .catch(() => null);
}

function extractContent (entries) {
    const entry = entries[0],
        firstMeaning = entry && entry.meanings && entry.meanings[0],
        firstDefinition = firstMeaning && firstMeaning.definitions[0];

    if (!firstDefinition || !firstDefinition.definition) { return null; }

    let meaning = firstDefinition.definition;
    meaning = meaning[0].toUpperCase() + meaning.substring(1);

    const phonetics = (entry.phonetics || []).find((phonetic) => phonetic.audio);

    return {
        word: entry.word,
        meaning: meaning,
        audioSrc: (phonetics && phonetics.audio) || null
    };
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
