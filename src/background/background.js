// Chrome (MV3) runs this file as a service worker and ignores the manifest's
// background.scripts list, so the polyfill must be imported here; Firefox runs
// an event page where importScripts does not exist and the manifest list applies.
if (typeof importScripts === "function") {
    importScripts("/src/shared/browser-polyfill.js");
}

const DEFAULT_HISTORY_SETTING = {
        enabled: true
    };

browser.runtime.onMessage.addListener((request) => {
    const { word, lang } = request;

    // TODO(v0.1): the Google-scraping lookup was removed here. Replace with a
    // dictionaryapi.dev fetch per PLAN.md §3, responding with
    // { word, meaning, audioSrc }.
    // TODO(v0.1): pronunciation audio must return in the dictionaryapi.dev
    // task — the API provides audio URLs, so `audioSrc` is re-sourced there,
    // not removed. The bubble's 🔊 button (PLAN.md §4) depends on it.
    const content = null;

    content && browser.storage.local.get().then((results) => {
        let history = results.history || DEFAULT_HISTORY_SETTING;

        history.enabled && saveWord(content)
    });

    return Promise.resolve({ content });
});

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
