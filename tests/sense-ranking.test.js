const { test } = require("node:test");
const assert = require("node:assert");
const { rankMeanings } = require("../src/shared/sense-ranking.js");

function longSense (text) {
    return { definition: text + " — padded so it dodges the short-sense stem check entirely" };
}

test("circular gloss is dropped, example sense promoted (the 'container' case)", () => {
    const ranked = rankMeanings([{
        partOfSpeech: "noun",
        definitions: [
            { definition: "one that contains" },
            { definition: "A receptacle in which things are kept or transported." },
            { definition: "A very large, typically metal, box used for transporting goods.", example: "The container was loaded at the port." }
        ]
    }], "container");

    assert.strictEqual(ranked[0].senses[0].example, "The container was loaded at the port.");
    assert.ok(!ranked[0].senses.some((sense) => sense.definition === "one that contains"));
});

test("stem matching handles doubled consonants (runner → run)", () => {
    const ranked = rankMeanings([{
        partOfSpeech: "noun",
        definitions: [
            { definition: "one who runs" },
            { definition: "A part of an apparatus that moves quickly along a track or groove." }
        ]
    }], "runner");

    assert.match(ranked[0].senses[0].definition, /^A part/);
});

test("a lone circular gloss is kept rather than emptying the bubble", () => {
    const ranked = rankMeanings([{
        partOfSpeech: "noun",
        definitions: [{ definition: "plural of goose" }]
    }], "geese");

    assert.strictEqual(ranked[0].senses.length, 1);
});

test("multi-POS words trim to 2 senses per POS, single-POS to 3", () => {
    const multi = rankMeanings([
        { partOfSpeech: "noun", definitions: [1, 2, 3, 4].map((i) => longSense("noun sense " + i)) },
        { partOfSpeech: "verb", definitions: [1, 2, 3].map((i) => longSense("verb sense " + i)) }
    ], "example");
    assert.deepStrictEqual(multi.map((group) => group.senses.length), [2, 2]);

    const single = rankMeanings([
        { partOfSpeech: "noun", definitions: [1, 2, 3, 4].map((i) => longSense("noun sense " + i)) }
    ], "example");
    assert.strictEqual(single[0].senses.length, 3);
});

test("equal scores keep source order (stable sort)", () => {
    const ranked = rankMeanings([{
        partOfSpeech: "noun",
        definitions: [longSense("First"), longSense("Second")]
    }], "unrelatedword");

    assert.match(ranked[0].senses[0].definition, /^First/);
});

test("POS groups with no definitions are filtered out", () => {
    const ranked = rankMeanings([
        { partOfSpeech: "noun", definitions: [] },
        { partOfSpeech: "verb", definitions: [longSense("A real verb sense")] }
    ], "example");

    assert.deepStrictEqual(ranked.map((group) => group.pos), ["verb"]);
});
