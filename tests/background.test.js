// Drives src/background/background.js with a stubbed polyfill surface, a
// stubbed IndexedDB layer, and a mocked fetch — no network, so it runs in CI.
const { test } = require("node:test");
const assert = require("node:assert");

let listener;
const fetched = [];
const state = {
    datasetReady: false,
    definitions: {} // word → stored record
};

global.browser = {
    runtime: { onMessage: { addListener: (fn) => { listener = fn; } } },
    storage: {
        local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve()
        }
    }
};
global.normalization = require("../src/shared/normalization.js");
global.senseRanking = require("../src/shared/sense-ranking.js");
global.lemmatize = require("../src/shared/lemmatize.js");
global.datasetReady = () => Promise.resolve(state.datasetReady);
global.lugaticDb = {
    getDefinition: (lang, word) => Promise.resolve(state.definitions[word]),
    getLemma: () => Promise.resolve(undefined)
};
global.fetch = (url) => {
    fetched.push(url);
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{
            word: "container",
            phonetics: [
                { text: "/kənˈteɪnə/", audio: "" },
                { audio: "https://example.invalid/container.mp3" }
            ],
            meanings: [{
                partOfSpeech: "noun",
                definitions: [
                    { definition: "one that contains" },
                    { definition: "A receptacle in which things are kept or transported." }
                ]
            }]
        }])
    });
};

require("../src/background/background.js");

const RESEARCHER_RECORD = {
    word: "researcher",
    lang: "en",
    entries: [{
        pos: "noun",
        senses: [{ definition: "a scientist who devotes themselves to doing research" }]
    }]
};

test("web fallback: lookup normalizes the selection and maps the API response", async () => {
    state.datasetReady = false;
    const { content } = await listener({ word: "“Container,”", lang: "en" });

    assert.strictEqual(fetched.at(-1), "https://api.dictionaryapi.dev/api/v2/entries/en/container");
    assert.strictEqual(content.word, "container");
    assert.match(content.meaning, /^A receptacle/);
    assert.strictEqual(content.source, "web");
    assert.strictEqual(content.audioSrc, "https://example.invalid/container.mp3");
    assert.ok(!content.senses[0].senses.some((sense) => /one that contains/i.test(sense.definition)));
});

test("punctuation-only selections resolve to null without fetching", async () => {
    const callsBefore = fetched.length;
    const { content } = await listener({ word: "?!...", lang: "en" });

    assert.strictEqual(content, null);
    assert.strictEqual(fetched.length, callsBefore);
});

test("local hit: imported dataset answers without any fetch", async () => {
    state.datasetReady = true;
    state.definitions = { researcher: RESEARCHER_RECORD };
    const callsBefore = fetched.length;

    const { content } = await listener({ word: "Researcher", lang: "en" });

    assert.strictEqual(content.source, "local");
    assert.match(content.meaning, /^A scientist/);
    assert.strictEqual(content.audioSrc, null);
    assert.strictEqual(fetched.length, callsBefore);
});

test("lemmatized hit: 'Researchers' resolves to the researcher record (QA finding)", async () => {
    state.datasetReady = true;
    state.definitions = { researcher: RESEARCHER_RECORD };
    const callsBefore = fetched.length;

    const { content } = await listener({ word: "Researchers", lang: "en" });

    assert.strictEqual(content.word, "researcher");
    assert.strictEqual(content.source, "local");
    assert.strictEqual(fetched.length, callsBefore);
});

test("local miss falls through to the web", async () => {
    state.datasetReady = true;
    state.definitions = {};

    const { content } = await listener({ word: "container", lang: "en" });

    assert.strictEqual(content.source, "web");
    assert.strictEqual(fetched.at(-1), "https://api.dictionaryapi.dev/api/v2/entries/en/container");
});

test("typed messages are ignored by the lookup listener", async () => {
    assert.strictEqual(listener({ type: "reimport-dataset" }), undefined);
});
