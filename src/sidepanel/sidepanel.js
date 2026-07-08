// Side panel result view (PLAN.md §4): renders lookups triggered from the
// context menu — the only trigger available in native PDF viewers. The
// background worker writes the lookup state to storage.session; this page
// reads it on load (the panel may open after the lookup already finished)
// and follows storage.onChanged afterwards.

const PANEL_STATE_KEY = "sidePanelLookup";

const panel = document.getElementById("panel");

function clear () {
    panel.textContent = "";
}

function addLine (parent, className, text) {
    const node = document.createElement("div");
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
}

function renderEmpty () {
    clear();
    addLine(panel, "muted", "Select text on a page or PDF, right-click, and choose “Look up” to see the definition here.");
}

function renderLoading (state) {
    clear();
    const row = document.createElement("div");
    row.className = "word-row";
    panel.appendChild(row);

    const heading = document.createElement("h1");
    heading.textContent = state.word || "Searching";
    row.appendChild(heading);

    addLine(panel, "muted sense", "Please wait…");
}

function renderNotFound (state) {
    clear();
    const row = document.createElement("div");
    row.className = "word-row";
    panel.appendChild(row);

    const heading = document.createElement("h1");
    heading.textContent = state.word || "Sorry";
    row.appendChild(heading);

    addLine(panel, "muted sense", "No definition found.");
}

function renderFound (state) {
    const content = state.content;
    clear();

    const row = document.createElement("div");
    row.className = "word-row";
    panel.appendChild(row);

    const heading = document.createElement("h1");
    heading.textContent = content.word;
    row.appendChild(heading);

    if (content.phonetic) {
        const phonetic = document.createElement("span");
        phonetic.className = "phonetic";
        phonetic.textContent = content.phonetic;
        row.appendChild(phonetic);
    }

    if (content.audioSrc) {
        const sound = document.createElement("audio");
        sound.src = content.audioSrc;

        const audioButton = document.createElement("button");
        audioButton.className = "audio";
        audioButton.title = "Play pronunciation";
        audioButton.addEventListener("click", () => { sound.play(); });
        row.appendChild(audioButton);
    }

    // The panel has room: render the full ranked entry, examples included
    // (the bubble's expanded "More ▾" view).
    const groups = content.fullSenses || content.senses || [];
    groups.forEach((group) => {
        addLine(panel, "pos", group.pos);

        group.senses.forEach((sense, index) => {
            const numbered = group.senses.length > 1 ? (index + 1) + ". " : "";
            addLine(panel, "sense", numbered + sense.definition);

            if (sense.example) {
                addLine(panel, "example", "“" + sense.example + "”");
            }
        });
    });

    const footer = document.createElement("div");
    footer.className = "footer";
    panel.appendChild(footer);

    if (content.source) {
        const badge = document.createElement("span");
        badge.className = "source-badge";
        badge.textContent = content.source === "local" ? "offline" : "web";
        footer.appendChild(badge);
    }

    const gear = document.createElement("button");
    gear.className = "settings-gear";
    gear.textContent = "⚙";
    gear.title = "Lugatic settings";
    gear.addEventListener("click", () => {
        browser.runtime.sendMessage({ type: "open-options" });
    });
    footer.appendChild(gear);
}

function render (state) {
    if (!state) { return renderEmpty(); }
    if (state.status === "loading") { return renderLoading(state); }
    if (state.status === "found" && state.content) { return renderFound(state); }
    return renderNotFound(state);
}

browser.storage.session.get(PANEL_STATE_KEY)
    .then((items) => render(items[PANEL_STATE_KEY]))
    .catch(() => renderEmpty());

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes[PANEL_STATE_KEY]) {
        render(changes[PANEL_STATE_KEY].newValue);
    }
});
