// Runtime lemmatization, regular inflections (PLAN.md §3 step 1, §5):
// Morphy-style suffix detachment generates candidate lemmas; the caller
// checks each against the dataset and consults the imported OEWN exception
// table first for irregulars ("geese" → goose), so rules here only need to
// cover regular morphology ("researchers" → researcher).
//
// Loaded three ways: Chrome MV3 service worker (importScripts), Firefox event
// page (manifest background.scripts), and Node tests (module.exports).
(function (global) {

    // WordNet Morphy detachment rules (POS-agnostic superset), most
    // specific first — order defines candidate priority.
    var DETACHMENTS = [
        ["ches", "ch"],
        ["shes", "sh"],
        ["ses", "s"],
        ["xes", "x"],
        ["zes", "z"],
        ["men", "man"],
        ["ies", "y"],
        ["ing", "e"],
        ["ing", ""],
        ["est", "e"],
        ["est", ""],
        ["ed", "e"],
        ["ed", ""],
        ["er", "e"],
        ["er", ""],
        ["es", "e"],
        ["es", ""],
        ["s", ""]
    ];

    var MIN_CANDIDATE_LENGTH = 2;

    function morphyCandidates (word) {
        var candidates = [];

        function push (candidate) {
            if (candidate.length >= MIN_CANDIDATE_LENGTH
                    && candidate !== word
                    && candidates.indexOf(candidate) === -1) {
                candidates.push(candidate);
            }
        }

        DETACHMENTS.forEach(function (rule) {
            var suffix = rule[0],
                replacement = rule[1];

            if (word.length > suffix.length && word.endsWith(suffix)) {
                var stem = word.slice(0, word.length - suffix.length),
                    candidate = stem + replacement;

                push(candidate);

                // "running" → "runn" → "run", "stopped" → "stopp" → "stop"
                if (!replacement && stem[stem.length - 1] === stem[stem.length - 2]) {
                    push(stem.slice(0, -1));
                }
            }
        });

        return candidates;
    }

    var lemmatize = { morphyCandidates: morphyCandidates };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = lemmatize;
    } else {
        global.lemmatize = lemmatize;
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
