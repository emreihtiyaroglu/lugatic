const { test } = require("node:test");
const assert = require("node:assert");

// dataset-import.js only wires listeners when a `browser` global exists;
// leaving it undefined lets the pure helpers load without side effects.
const { toBatches, isImported } = require("../src/background/dataset-import.js");

test("toBatches splits records and keeps order and remainder", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];

    assert.deepStrictEqual(toBatches(items, 3), [[1, 2, 3], [4, 5, 6], [7]]);
    assert.deepStrictEqual(toBatches(items, 7), [items]);
    assert.deepStrictEqual(toBatches(items, 100), [items]);
    assert.deepStrictEqual(toBatches([], 5), []);
});

test("isImported only reports ready on an exact version match", () => {
    const manifest = { lang: "en", version: "c798294f5a44" };

    assert.strictEqual(isImported({ importedVersion: "c798294f5a44" }, manifest), true);
    assert.strictEqual(isImported({ importedVersion: "000000000000" }, manifest), false);
    assert.strictEqual(isImported({ importedVersion: null, progress: { done: 5, total: 10 } }, manifest), false);
    assert.strictEqual(isImported(undefined, manifest), false);
    assert.strictEqual(isImported({ importedVersion: "c798294f5a44" }, undefined), false);
});
