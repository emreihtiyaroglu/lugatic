const DEFAULT_LANGUAGE = 'en',
    DEFAULT_TRIGGER_KEY = 'none',
    DEFAULT_TRIGGER_MODE = 'dblclick',
    IS_HISTORY_ENABLED_BY_DEFAULT = true,

    SAVE_STATUS = document.querySelector("#save-status"),

    SAVE_OPTIONS_BUTTON = document.querySelector("#save-btn"),
    RESET_OPTIONS_BUTTON = document.querySelector("#reset-btn"),

    CLEAR_HISTORY_BUTTON = document.querySelector("#clear-history-btn"),
    DOWNLOAD_HISTORY_BUTTON = document.querySelector("#download-history-btn"),

    OS_MAC = 'mac',

    KEY_COMMAND = 'Command',
    KEY_META = 'meta';



function saveOptions(e) {
    browser.storage.local.set({
        language: document.querySelector("#language-selector").value,
        interaction: {
            mode: document.querySelector("#trigger-mode").value,
            dblClick: {
                key: document.querySelector("#popup-dblclick-key").value
            }
        },
        history: {
            enabled: document.querySelector("#store-history-checkbox").checked
        }
    }).then(showSaveStatusAnimation);

    e.preventDefault();
  }
  
  function restoreOptions() {
    let storageItem = browser.storage.local.get();

    storageItem.then((results) => {
        let language = results.language,
            interaction = results.interaction || {},
            history = results.history || { enabled: IS_HISTORY_ENABLED_BY_DEFAULT },
            definitions = results.definitions || {};
        
        // language
        document.querySelector("#language-selector").value = language || DEFAULT_LANGUAGE;

        // interaction
        document.querySelector("#trigger-mode").value = interaction.mode || DEFAULT_TRIGGER_MODE;
        document.querySelector("#popup-dblclick-key").value = (interaction.dblClick && interaction.dblClick.key) || DEFAULT_TRIGGER_KEY;
        
        // document.querySelector("#popup-select-checkbox").checked = interaction.select.enabled;
        // document.querySelector("#popup-select-key").value = interaction.select.key;

        // history
        document.querySelector("#store-history-checkbox").checked = history.enabled;
        document.querySelector("#num-words-in-history").innerText = Object.keys(definitions).length;
    });
  }
  
  function downloadHistory (e) {
    let fileContent = "",
        storageItem = browser.storage.local.get("definitions"),
        anchorTag = document.querySelector("#download-history-link");

    storageItem.then((results) => {
        let definitions = results.definitions || {};

        for (let definition in definitions) {
            if (!Object.prototype.hasOwnProperty.call(definitions, definition)) { return; }

            fileContent += definition;
            fileContent += "\t";
            fileContent += "\t";
            fileContent += definitions[definition];
            fileContent += "\n";
        }

        anchorTag.href = window.URL.createObjectURL(new Blob([fileContent],{
            type: "text/plain"
        }));

        anchorTag.dispatchEvent(new MouseEvent('click'));
    });

    e.preventDefault();
  }

  function resetOptions (e) {
    browser.storage.local.set({
        language: DEFAULT_LANGUAGE,
        interaction: {
            mode: DEFAULT_TRIGGER_MODE,
            dblClick: {
                key: DEFAULT_TRIGGER_KEY
            }
        },
        history: {
            enabled: IS_HISTORY_ENABLED_BY_DEFAULT
        }
    }).then(restoreOptions);

    e.preventDefault();
  }

  function clearHistory(e) {
    browser.storage.local.set({ definitions: {} });

    e.preventDefault();
  }

  function showSaveStatusAnimation () {
    SAVE_STATUS.style.setProperty("-webkit-transition", "opacity 0s ease-out");
    SAVE_STATUS.style.opacity = 1;
    window.setTimeout(function() {
        SAVE_STATUS.style.setProperty("-webkit-transition", "opacity 0.4s ease-out");
        SAVE_STATUS.style.opacity = 0
    }, 1500);
  }

  // --- Offline dictionary status (PLAN.md §6) ---

  const DATASET_STATUS = document.querySelector("#dataset-status"),
      DATASET_STORAGE = document.querySelector("#dataset-storage"),
      CACHE_COUNT = document.querySelector("#cache-count"),
      REIMPORT_DATASET_BUTTON = document.querySelector("#reimport-dataset-btn"),
      REMOVE_DATASET_BUTTON = document.querySelector("#remove-dataset-btn"),
      CLEAR_CACHE_BUTTON = document.querySelector("#clear-cache-btn");

  let datasetManifest = null,
      datasetRefreshTimer = null;

  function scheduleDatasetRefresh (delay) {
    window.clearTimeout(datasetRefreshTimer);
    datasetRefreshTimer = window.setTimeout(refreshDatasetStatus, delay);
  }

  function refreshDatasetStatus () {
    const manifestReady = datasetManifest
        ? Promise.resolve(datasetManifest)
        : fetch(browser.runtime.getURL("/assets/data/dataset-manifest.json"))
            .then((response) => response.json())
            .then((manifest) => (datasetManifest = manifest));

    refreshStorageEstimate();
    refreshCacheCount();

    manifestReady
        .then((manifest) => lugaticDb.getMeta(manifest.lang).then((meta) => {
            if (meta && meta.disabled) {
                DATASET_STATUS.textContent = "Offline data removed — lookups use the web";
                return;
            }
            if (meta && meta.importedVersion === manifest.version) {
                DATASET_STATUS.textContent =
                    "Ready — v" + manifest.version + " · " + meta.words + " words";
                return;
            }

            DATASET_STATUS.textContent = meta && meta.progress
                ? "Importing… " + meta.progress.done + " / " + meta.progress.total
                : "Waiting for first import…";
            scheduleDatasetRefresh(500);
        }))
        .catch(() => {
            DATASET_STATUS.textContent = "Status unavailable";
        });
  }

  function refreshCacheCount () {
    lugaticDb.countStore("cache")
        .then((count) => { CACHE_COUNT.textContent = count; })
        .catch(() => { CACHE_COUNT.textContent = "unavailable"; });
  }

  function refreshStorageEstimate () {
    if (!navigator.storage || !navigator.storage.estimate) {
        DATASET_STORAGE.textContent = "not reported by this browser";
        return;
    }

    navigator.storage.estimate().then((estimate) => {
        DATASET_STORAGE.textContent =
            (estimate.usage / 1024 / 1024).toFixed(1) + " MB (browser estimate)";
    });
  }

  function reimportDataset (e) {
    browser.runtime.sendMessage({ type: "reimport-dataset" });
    DATASET_STATUS.textContent = "Importing…";
    scheduleDatasetRefresh(500);

    e.preventDefault();
  }

  function removeOfflineData (e) {
    browser.runtime.sendMessage({ type: "remove-offline-data" })
        .then(() => refreshDatasetStatus());
    DATASET_STATUS.textContent = "Removing…";

    e.preventDefault();
  }

  function clearWebCache (e) {
    browser.runtime.sendMessage({ type: "clear-web-cache" })
        .then(() => refreshCacheCount());

    e.preventDefault();
  }

  REIMPORT_DATASET_BUTTON.addEventListener("click", reimportDataset);
  REMOVE_DATASET_BUTTON.addEventListener("click", removeOfflineData);
  CLEAR_CACHE_BUTTON.addEventListener("click", clearWebCache);
  document.addEventListener("DOMContentLoaded", refreshDatasetStatus);

  document.addEventListener('DOMContentLoaded', restoreOptions);

  CLEAR_HISTORY_BUTTON.addEventListener("click", clearHistory);
  DOWNLOAD_HISTORY_BUTTON.addEventListener("click", downloadHistory);

  SAVE_OPTIONS_BUTTON.addEventListener("click", saveOptions);
  RESET_OPTIONS_BUTTON.addEventListener("click", resetOptions);

  if (window.navigator.platform.toLowerCase().includes(OS_MAC)) {
    document.getElementById("popup-dblclick-key-ctrl").textContent = KEY_COMMAND;
    document.getElementById("popup-dblclick-key-ctrl").value = KEY_META;
  }
