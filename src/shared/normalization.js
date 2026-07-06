// Word normalization (PLAN.md §3 step 1, v0.1 scope): trim, strip punctuation
// clinging to the selection, lowercase. Lemma mapping and phrase handling
// arrive with v0.5.
//
// Loaded three ways: Chrome MV3 service worker (importScripts), Firefox event
// page (manifest background.scripts), and Node tests (module.exports).
(function (global) {

    // Quotes, brackets and terminators that double-click or drag selections
    // drag along, in ASCII and common typographic forms. Internal characters
    // (hyphens in "state-of-the-art", the apostrophe in "don't") survive.
    var SURROUNDING_PUNCTUATION = /^[\s"'“”‘’«»‹›()[\]{}<>.,;:!?…·•—–-]+|[\s"'“”‘’«»‹›()[\]{}<>.,;:!?…·•—–-]+$/g;

    function normalizeWord (selection) {
        return (selection || "")
            .replace(SURROUNDING_PUNCTUATION, "")
            .replace(/’/g, "'")
            .toLowerCase();
    }

    var normalization = { normalizeWord: normalizeWord };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = normalization;
    } else {
        global.normalization = normalization;
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
