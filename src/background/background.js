const DEFAULT_HISTORY_SETTING = {
        enabled: true
    };

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { word, lang } = request;

    // TODO(v0.1): the Google-scraping lookup was removed here. Replace with a
    // dictionaryapi.dev fetch per PLAN.md §3, responding with
    // { word, meaning, audioSrc }.
    // TODO(v0.1): pronunciation audio must return in the dictionaryapi.dev
    // task — the API provides audio URLs, so `audioSrc` is re-sourced there,
    // not removed. The bubble's 🔊 button (PLAN.md §4) depends on it.
    const content = null;

    sendResponse({ content });

    content && browser.storage.local.get().then((results) => {
        let history = results.history || DEFAULT_HISTORY_SETTING;

        history.enabled && saveWord(content)
    });

    return true;
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
