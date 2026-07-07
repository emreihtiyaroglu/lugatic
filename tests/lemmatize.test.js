const { test } = require("node:test");
const assert = require("node:assert");
const { morphyCandidates } = require("../src/shared/lemmatize.js");

test("regular plurals and verb forms produce the right candidates", () => {
    assert.ok(morphyCandidates("researchers").includes("researcher"));
    assert.ok(morphyCandidates("studies").includes("study"));
    assert.ok(morphyCandidates("boxes").includes("box"));
    assert.ok(morphyCandidates("churches").includes("church"));
    assert.ok(morphyCandidates("rendering").includes("render"));
    assert.ok(morphyCandidates("rendered").includes("render"));
});

test("doubled consonants are undoubled after -ing/-ed stripping", () => {
    assert.ok(morphyCandidates("running").includes("run"));
    assert.ok(morphyCandidates("stopped").includes("stop"));
});

test("candidates are deduplicated, never the input, and include the real lemma", () => {
    const candidates = morphyCandidates("houses");

    assert.deepStrictEqual(candidates, [...new Set(candidates)]);
    assert.ok(!candidates.includes("houses"));
    // Junk candidates like "hous" are fine — they miss the dataset; the
    // membership check is the filter, not this list.
    assert.ok(candidates.includes("house"));
});

test("too-short words produce no candidates", () => {
    assert.deepStrictEqual(morphyCandidates("as"), []);
    assert.deepStrictEqual(morphyCandidates("is"), []);
});
