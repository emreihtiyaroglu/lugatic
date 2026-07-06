const { test } = require("node:test");
const assert = require("node:assert");
const { normalizeWord } = require("../src/shared/normalization.js");

test("strips surrounding punctuation and lowercases", () => {
    const cases = [
        ["word,", "word"],
        ["“Running”", "running"],
        ["  spaced  ", "spaced"],
        ["(bracketed).", "bracketed"],
        ["Word!?", "word"]
    ];

    for (const [input, expected] of cases) {
        assert.strictEqual(normalizeWord(input), expected, JSON.stringify(input));
    }
});

test("keeps internal hyphens and apostrophes, converts curly apostrophes", () => {
    assert.strictEqual(normalizeWord("state-of-the-art"), "state-of-the-art");
    assert.strictEqual(normalizeWord("don't"), "don't");
    assert.strictEqual(normalizeWord("don’t"), "don't");
});

test("degenerate selections normalize to the empty string", () => {
    for (const input of ["...", "?!", "", null, undefined, "  "]) {
        assert.strictEqual(normalizeWord(input), "");
    }
});
