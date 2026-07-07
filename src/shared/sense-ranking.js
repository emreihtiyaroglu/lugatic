// Sense quality ranking (PLAN.md §3): dictionary sources often list circular
// morphological glosses first ("container: one that contains"). Score senses
// per part of speech so the bubble can show the most explanatory ones.
//
// Loaded three ways: Chrome MV3 service worker (importScripts), Firefox event
// page (manifest background.scripts), and Node tests (module.exports).
(function (global) {

    var CIRCULAR_GLOSS_PATTERN = /\b(one (who|that)|that which|plural of)\b/i,
        SHORT_SENSE_LENGTH = 60,
        MIN_STEM_LENGTH = 3,

        // Longest-match-first; stripping one suffix approximates the stem
        // ("container" → "contain"), which circular glosses tend to reuse.
        SUFFIXES = ["ations", "ation", "ings", "ness", "ment", "ers", "ors",
                    "ies", "ing", "ity", "ed", "er", "es", "ly", "or", "s"];

    function stemsOf (headword) {
        var word = headword.toLowerCase(),
            stems = [word];

        for (var i = 0; i < SUFFIXES.length; i++) {
            var suffix = SUFFIXES[i];

            if (word.length - suffix.length >= MIN_STEM_LENGTH && word.endsWith(suffix)) {
                var stem = word.slice(0, word.length - suffix.length);
                stems.push(stem);

                // "runner" → "runn" → "run"
                if (stem[stem.length - 1] === stem[stem.length - 2]) {
                    stems.push(stem.slice(0, -1));
                }
                break;
            }
        }

        return stems;
    }

    function scoreSense (sense, stems) {
        var definition = (sense.definition || "").toLowerCase(),
            score = 0;

        if (CIRCULAR_GLOSS_PATTERN.test(definition)) {
            score -= 2;
        }

        if (definition.length < SHORT_SENSE_LENGTH) {
            for (var i = 0; i < stems.length; i++) {
                if (definition.indexOf(stems[i]) !== -1) {
                    score -= 2;
                    break;
                }
            }
        }

        if (sense.example) {
            score += 1;
        }

        return score;
    }

    // meanings: dictionaryapi.dev shape [{ partOfSpeech, definitions: [...] }]
    // Returns [{ pos, senses: [{ definition, example }] }], best senses first,
    // trimmed to 3 per POS for single-POS words, else 2 (PLAN.md §4: "2–3").
    // maxPerPos overrides the trim (Infinity = full ranked entry, for the
    // bubble's expanded view); dropped junk senses stay dropped either way.
    function rankMeanings (meanings, headword, maxPerPos) {
        var stems = stemsOf(headword || ""),
            perPos = maxPerPos || (meanings.length > 1 ? 2 : 3);

        return meanings.map(function (meaning) {
            var scored = (meaning.definitions || []).map(function (sense, index) {
                return { sense: sense, index: index, score: scoreSense(sense, stems) };
            });

            // Stable: source order is itself a relevance signal.
            scored.sort(function (a, b) {
                return b.score - a.score || a.index - b.index;
            });

            // Demoted senses are dropped outright, unless nothing better
            // exists — a lone circular gloss beats an empty bubble.
            var kept = scored.filter(function (item) { return item.score >= 0; });
            if (!kept.length && scored.length) {
                kept = [scored[0]];
            }

            return {
                pos: meaning.partOfSpeech,
                senses: kept.slice(0, perPos).map(function (item) {
                    return {
                        definition: item.sense.definition,
                        example: item.sense.example || null
                    };
                })
            };
        }).filter(function (group) {
            return group.senses.length > 0;
        });
    }

    var senseRanking = { rankMeanings: rankMeanings };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = senseRanking;
    } else {
        global.senseRanking = senseRanking;
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
