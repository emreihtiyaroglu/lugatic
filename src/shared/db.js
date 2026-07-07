// IndexedDB helpers (PLAN.md §5/§6): stores are language-keyed, and
// connections are opened per operation and closed after — MV3 service
// workers sleep, so nothing may live in globals (CLAUDE.md).
//
// Loaded three ways: Chrome MV3 service worker (importScripts), Firefox event
// page (manifest background.scripts), and options page (script tag).
(function (global) {

    var DB_NAME = "lugatic",
        DB_VERSION = 1;

    function openDatabase () {
        return new Promise(function (resolve, reject) {
            var request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (event) {
                var db = event.target.result;

                if (!db.objectStoreNames.contains("definitions")) {
                    db.createObjectStore("definitions", { keyPath: ["lang", "word"] });
                }
                if (!db.objectStoreNames.contains("lemmas")) {
                    db.createObjectStore("lemmas", { keyPath: ["lang", "form"] });
                }
                if (!db.objectStoreNames.contains("meta")) {
                    db.createObjectStore("meta", { keyPath: "lang" });
                }
            };
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
        });
    }

    function withStore (storeName, mode, run) {
        return openDatabase().then(function (db) {
            return new Promise(function (resolve, reject) {
                var transaction = db.transaction(storeName, mode),
                    result = run(transaction.objectStore(storeName));

                transaction.oncomplete = function () {
                    db.close();
                    resolve(result && "result" in result ? result.result : undefined);
                };
                transaction.onerror = function () {
                    db.close();
                    reject(transaction.error);
                };
            });
        });
    }

    function getMeta (lang) {
        return withStore("meta", "readonly", function (store) {
            return store.get(lang);
        });
    }

    function putMeta (meta) {
        return withStore("meta", "readwrite", function (store) {
            store.put(meta);
        });
    }

    function getDefinition (lang, word) {
        return withStore("definitions", "readonly", function (store) {
            return store.get([lang, word]);
        });
    }

    function getLemma (lang, form) {
        return withStore("lemmas", "readonly", function (store) {
            return store.get([lang, form]);
        });
    }

    function bulkPut (storeName, records) {
        return withStore(storeName, "readwrite", function (store) {
            records.forEach(function (record) { store.put(record); });
        });
    }

    function clearStore (storeName) {
        return withStore(storeName, "readwrite", function (store) {
            store.clear();
        });
    }

    var lugaticDb = {
        openDatabase: openDatabase,
        getMeta: getMeta,
        putMeta: putMeta,
        getDefinition: getDefinition,
        getLemma: getLemma,
        bulkPut: bulkPut,
        clearStore: clearStore
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = lugaticDb;
    } else {
        global.lugaticDb = lugaticDb;
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
