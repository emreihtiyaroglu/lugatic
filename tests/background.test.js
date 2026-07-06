// Drives src/background/background.js with a stubbed polyfill surface and a
// mocked fetch — no network, so it can run in CI.
const { test } = require("node:test");
const assert = require("node:assert");

let listener;
const fetched = [];

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

test("lookup normalizes the selection and maps the API response", async () => {
    const { content } = await listener({ word: "“Container,”", lang: "en" });

    assert.strictEqual(fetched.at(-1), "https://api.dictionaryapi.dev/api/v2/entries/en/container");
    assert.strictEqual(content.word, "container");
    assert.match(content.meaning, /^A receptacle/);
    assert.strictEqual(content.audioSrc, "https://example.invalid/container.mp3");
    assert.ok(!content.senses[0].senses.some((sense) => /one that contains/i.test(sense.definition)));
});

test("punctuation-only selections resolve to null without fetching", async () => {
    const callsBefore = fetched.length;
    const { content } = await listener({ word: "?!...", lang: "en" });

    assert.strictEqual(content, null);
    assert.strictEqual(fetched.length, callsBefore);
});
