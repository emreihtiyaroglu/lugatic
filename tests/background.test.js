// Drives src/background/background.js with a stubbed polyfill surface, a
// stubbed IndexedDB layer, and a mocked fetch — no network, so it runs in CI.
const { test } = require("node:test");
const assert = require("node:assert");

let listener, installedListener, menuClickListener;
const fetched = [];
const menusCreated = [];
const panelOpens = [];
const panelStates = []; // every value written to storage.session
const localSets = []; // every value written to storage.local
const state = {
    datasetReady: false,
    definitions: {}, // word → stored record
    cache: {} // word → cache entry
};

global.browser = {
    runtime: {
        onMessage: { addListener: (fn) => { listener = fn; } },
        onInstalled: { addListener: (fn) => { installedListener = fn; } }
    },
    contextMenus: {
        create: (properties) => { menusCreated.push(properties); },
        onClicked: { addListener: (fn) => { menuClickListener = fn; } }
    },
    sidePanel: {
        open: (options) => { panelOpens.push(options); return Promise.resolve(); }
    },
    storage: {
        local: {
            get: () => Promise.resolve({}),
            set: (items) => { localSets.push(items); return Promise.resolve(); }
        },
        session: {
            set: (items) => { panelStates.push(items.sidePanelLookup); return Promise.resolve(); }
        }
    }
};

// Flushes the promise chains behind a fire-and-forget handler (context-menu
// clicks return nothing to await).
async function settled () {
    for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setImmediate(resolve));
    }
}
global.normalization = require("../src/shared/normalization.js");
global.senseRanking = require("../src/shared/sense-ranking.js");
global.lemmatize = require("../src/shared/lemmatize.js");
global.datasetReady = () => Promise.resolve(state.datasetReady);
global.lugaticDb = {
    getDefinition: (lang, word) => Promise.resolve(state.definitions[word]),
    getLemma: () => Promise.resolve(undefined),
    getCached: (lang, word) => Promise.resolve(state.cache[word]),
    putCached: (entry) => { state.cache[entry.word] = entry; return Promise.resolve(); }
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
    assert.strictEqual(content.phonetic, "/kənˈteɪnə/");
    assert.ok(Array.isArray(content.fullSenses), "full ranked entry shipped for the expanded view");
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

test("web results are cached permanently under the normalized query", async () => {
    state.datasetReady = false;
    state.definitions = {};
    state.cache = {};

    const { content } = await listener({ word: "“Container,”", lang: "en" });

    assert.strictEqual(content.source, "web");
    assert.ok(state.cache.container, "cache entry keyed by normalized query");
    assert.strictEqual(state.cache.container.lang, "en");
    assert.strictEqual(state.cache.container.content.word, "container");
});

test("cached results are served without fetching", async () => {
    state.datasetReady = false;
    state.definitions = {};
    state.cache = {
        container: { lang: "en", word: "container", content: { word: "container", meaning: "Cached.", senses: [], audioSrc: null, source: "web" } }
    };
    const callsBefore = fetched.length;

    const { content } = await listener({ word: "Container", lang: "en" });

    assert.strictEqual(content.meaning, "Cached.");
    assert.strictEqual(fetched.length, callsBefore);
});

test("misses are not cached", async () => {
    state.datasetReady = false;
    state.definitions = {};
    state.cache = {};
    const okFetch = global.fetch;
    global.fetch = (url) => { fetched.push(url); return Promise.resolve({ ok: false }); };

    const { content } = await listener({ word: "xqzwv", lang: "en" });
    global.fetch = okFetch;

    assert.strictEqual(content, null);
    assert.deepStrictEqual(state.cache, {});
});

test("local hits win over the cache", async () => {
    state.datasetReady = true;
    state.definitions = { researcher: RESEARCHER_RECORD };
    state.cache = {
        researcher: { lang: "en", word: "researcher", content: { word: "researcher", meaning: "Stale cached.", senses: [], audioSrc: null, source: "web" } }
    };

    const { content } = await listener({ word: "researcher", lang: "en" });

    assert.strictEqual(content.source, "local");
});

test("typed messages are ignored by the lookup listener", async () => {
    assert.strictEqual(listener({ type: "reimport-dataset" }), undefined);
});

test("install registers the selection context menu", () => {
    installedListener();

    assert.strictEqual(menusCreated.length, 1);
    assert.strictEqual(menusCreated[0].id, "lugatic-lookup");
    assert.deepStrictEqual(menusCreated[0].contexts, ["selection"]);
    assert.match(menusCreated[0].title, /%s/);
});

test("context menu click opens the side panel synchronously (user gesture)", async () => {
    state.datasetReady = false;
    state.cache = {};

    menuClickListener(
        { menuItemId: "lugatic-lookup", selectionText: "Container" },
        { id: 3, windowId: 7 }
    );

    // Before any promise resolves: Chrome rejects sidePanel.open once the
    // gesture context is lost to an await.
    assert.deepStrictEqual(panelOpens.at(-1), { windowId: 7 });

    await settled();
});

test("context menu lookup publishes loading then found to the panel state", async () => {
    state.datasetReady = false;
    state.cache = {};
    panelStates.length = 0;

    menuClickListener(
        { menuItemId: "lugatic-lookup", selectionText: "“Container,”" },
        { id: 3, windowId: 7 }
    );
    await settled();

    assert.strictEqual(panelStates.length, 2);
    assert.strictEqual(panelStates[0].status, "loading");
    assert.strictEqual(panelStates[0].word, "container");
    assert.strictEqual(panelStates[1].status, "found");
    assert.strictEqual(panelStates[1].content.word, "container");
    assert.strictEqual(panelStates[1].content.source, "web");
});

test("context menu lookup saves to history like the bubble path", async () => {
    state.datasetReady = false;
    state.cache = {};
    localSets.length = 0;

    menuClickListener(
        { menuItemId: "lugatic-lookup", selectionText: "container" },
        { id: 3, windowId: 7 }
    );
    await settled();

    const historyWrite = localSets.find((items) => items.definitions);
    assert.ok(historyWrite, "history write happened");
    assert.ok(historyWrite.definitions.container, "keyed by the looked-up word");
});

test("context menu lookup misses publish not-found with no content", async () => {
    state.datasetReady = false;
    state.cache = {};
    panelStates.length = 0;
    const okFetch = global.fetch;
    global.fetch = (url) => { fetched.push(url); return Promise.resolve({ ok: false }); };

    menuClickListener(
        { menuItemId: "lugatic-lookup", selectionText: "xqzwv" },
        { id: 3, windowId: 7 }
    );
    await settled();
    global.fetch = okFetch;

    assert.strictEqual(panelStates.at(-1).status, "not-found");
    assert.strictEqual(panelStates.at(-1).content, null);
    assert.strictEqual(panelStates.at(-1).word, "xqzwv");
});

test("clicks from other menu items are ignored", async () => {
    const opensBefore = panelOpens.length;
    const statesBefore = panelStates.length;

    menuClickListener({ menuItemId: "someone-elses-menu", selectionText: "word" }, { id: 3, windowId: 7 });
    await settled();

    assert.strictEqual(panelOpens.length, opensBefore);
    assert.strictEqual(panelStates.length, statesBefore);
});

test("falls back to sidebarAction.open when sidePanel is unavailable (Firefox)", async () => {
    const sidePanel = global.browser.sidePanel;
    let sidebarOpened = 0;
    global.browser.sidePanel = undefined;
    global.browser.sidebarAction = { open: () => { sidebarOpened++; return Promise.resolve(); } };

    menuClickListener(
        { menuItemId: "lugatic-lookup", selectionText: "container" },
        { id: 3, windowId: 7 }
    );

    assert.strictEqual(sidebarOpened, 1);

    await settled();
    global.browser.sidePanel = sidePanel;
    delete global.browser.sidebarAction;
});
