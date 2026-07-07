    var DEFAULT_LANGUAGE = 'en',
        DEFAULT_TRIGGER_KEY = 'none',
        DEFAULT_TRIGGER_MODE = 'dblclick',

        LANGUAGE,
        TRIGGER_KEY,
        TRIGGER_MODE;

    function showMeaning (event){
        var info = getSelectionInfo(event);

        if (!info) { return; }

        showMeaningForInfo(info);
    }

    function showMeaningForInfo (info){
        removeTriggerButton();

        var createdDiv = createDiv(info);

        retrieveMeaning(info)
            .then((response) => {
                if (!response.content) { return noMeaningFound(createdDiv); }

                appendToDiv(createdDiv, response.content);
            });
    }

    // Floating selection button (PLAN.md §4): shown near the selection when
    // the trigger mode asks for it; clicking it opens the bubble. The icon
    // is the Lugatic bookshelf built with DOM calls — no fetch, no innerHTML.
    var SVG_NS = "http://www.w3.org/2000/svg";

    function buildTriggerIcon (){
        var svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 128 128");
        svg.setAttribute("width", "20");
        svg.setAttribute("height", "20");

        [
            ["rect", { width: "128", height: "128", rx: "24", fill: "#3949AB" }],
            ["rect", { x: "24", y: "24", width: "18", height: "62", fill: "#FFFFFF" }],
            ["rect", { x: "48", y: "34", width: "18", height: "52", fill: "#FFFFFF" }],
            ["path", { d: "M74 40 L90 34 L104 82 L88 88 Z", fill: "#FFFFFF" }],
            ["rect", { x: "24", y: "90", width: "80", height: "16", fill: "#FFFFFF" }]
        ].forEach(function(shape){
            var element = document.createElementNS(SVG_NS, shape[0]);
            Object.keys(shape[1]).forEach(function(attr){
                element.setAttribute(attr, shape[1][attr]);
            });
            svg.appendChild(element);
        });

        return svg;
    }

    function showTriggerButton (event){
        removeTriggerButton();

        if (TRIGGER_MODE !== 'button' && TRIGGER_MODE !== 'both') { return; }
        if (document.querySelector('.dictionaryDiv')) { return; }

        var info = getSelectionInfo(event);
        if (!info) { return; }

        var host = document.createElement('div');
        host.className = 'lugaticTriggerButton';
        host.style.position = 'absolute';
        host.style.left = info.left + 'px';
        host.style.top = info.bottom + 8 + 'px';
        host.style.zIndex = '1000000';
        host.attachShadow({ mode: 'open' });

        var button = document.createElement('div');
        button.style = 'width: 24px; height: 24px; border-radius: 6px; cursor: pointer; background: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;';
        button.title = 'Look up with Lugatic';
        button.appendChild(buildTriggerIcon());
        button.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            showMeaningForInfo(info);
        });

        host.shadowRoot.appendChild(button);
        document.body.appendChild(host);
    }

    function removeTriggerButton (){
        document.querySelectorAll('.lugaticTriggerButton').forEach(function(node){
            node.remove();
        });
    }


    function getSelectionInfo(event) {
        var word;
        var boundingRect;

        if (window.getSelection().toString().length > 1) {
            word = window.getSelection().toString();
            boundingRect = getSelectionCoords(window.getSelection());
        } else {
            return null;
        }

        var top = boundingRect.top + window.scrollY,
            bottom = boundingRect.bottom + window.scrollY,
            left = boundingRect.left + window.scrollX;

        if (boundingRect.height == 0) {
            top = event.pageY;
            bottom = event.pageY;
            left = event.pageX;
        }

        return {
            top: top,
            bottom: bottom,
            left: left,
            word: word,
            clientY: event.clientY,
            height: boundingRect.height
        };
    }

    function retrieveMeaning(info){
        return browser.runtime.sendMessage({ word: info.word, lang: LANGUAGE, time: Date.now() });
    }

    function createDiv(info) {
        var hostDiv = document.createElement("div");

        hostDiv.className = "dictionaryDiv";
        hostDiv.style.left = info.left -10 + "px";
        hostDiv.style.position = "absolute";
        hostDiv.style.zIndex = "1000000"
        hostDiv.attachShadow({mode: 'open'});

        var shadow = hostDiv.shadowRoot;
        var style = document.createElement("style");
        //style.textContent = "*{ all: initial}";
        style.textContent = ".mwe-popups{background:#fff;position:absolute;z-index:110;-webkit-box-shadow:0 30px 90px -20px rgba(0,0,0,0.3),0 0 1px #a2a9b1;box-shadow:0 30px 90px -20px rgba(0,0,0,0.3),0 0 1px #a2a9b1;padding:0;font-size:14px;min-width:300px;border-radius:2px}.mwe-popups.mwe-popups-is-not-tall{width:320px}.mwe-popups .mwe-popups-container{color:#222;margin-top:-9px;padding-top:9px;text-decoration:none}.mwe-popups.mwe-popups-is-not-tall .mwe-popups-extract{min-height:40px;max-height:140px;overflow:hidden;margin-bottom:47px;padding-bottom:0}.mwe-popups .mwe-popups-extract{margin:16px;display:block;color:#222;text-decoration:none;position:relative} .mwe-popups.flipped_y:before{content:'';position:absolute;border:8px solid transparent;border-bottom:0;border-top: 8px solid #a2a9b1;bottom:-8px;left:10px}.mwe-popups.flipped_y:after{content:'';position:absolute;border:11px solid transparent;border-bottom:0;border-top:11px solid #fff;bottom:-7px;left:7px} .mwe-popups.mwe-popups-no-image-tri:before{content:'';position:absolute;border:8px solid transparent;border-top:0;border-bottom: 8px solid #a2a9b1;top:-8px;left:10px}.mwe-popups.mwe-popups-no-image-tri:after{content:'';position:absolute;border:11px solid transparent;border-top:0;border-bottom:11px solid #fff;top:-7px;left:7px} .audio{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAcUlEQVQ4y2P4//8/AyUYQhAH3gNxA7IAIQPmo/H3g/QA8XkgFiBkwHyoYnRQABVfj88AmGZcTuuHyjlgMwBZM7IE3NlQGhQe65EN+I8Dw8MLGgYoFpFqADK/YUAMwOsFigORatFIlYRElaRMWmaiBAMAp0n+3U0kqkAAAAAASUVORK5CYII=);background-position: center;background-repeat: no-repeat;cursor:pointer;margin-left: 8px;opacity: 0.5; width: 16px; display: inline-block;} .audio:hover {opacity: 1;}";
        shadow.appendChild(style);

        var encapsulateDiv = document.createElement("div");
        encapsulateDiv.style = "all: initial; text-shadow: transparent 0px 0px 0px, rgba(0,0,0,1) 0px 0px 0px !important;";
        shadow.appendChild(encapsulateDiv);


        var popupDiv = document.createElement("div");
        popupDiv.style = "font-family: arial,sans-serif; border-radius: 12px; border: 1px solid #a2a9b1; box-shadow: 0 0 17px rgba(0,0,0,0.5)";
        encapsulateDiv.appendChild(popupDiv);


        var contentContainer = document.createElement("div");
        contentContainer.className = "mwe-popups-container";
        popupDiv.appendChild(contentContainer);



        var content = document.createElement("div");
        content.className = "mwe-popups-extract";
        // Collapsed cap ≈ 280px bubble total (PLAN.md §4); the sense area
        // gets the remainder after heading and footer.
        content.style = "line-height: 1.4; margin-top: 0px; margin-bottom: 8px; max-height: 190px; overflow: hidden;";
        contentContainer.appendChild(content);


        var heading = document.createElement("h3");
        heading.style = "margin-block-end: 0px; display:inline-block;";
        heading.textContent = "Searching";

        var phonetic = document.createElement("span");
        phonetic.style = "display: none; color: #72777d; font-size: 13px; margin-left: 8px;";

        var meaning = document.createElement("p");
        meaning.style = "margin-top: 10px";
        meaning.textContent = "Please Wait...";

        var audio = document.createElement("div");
        audio.className = "audio";
        audio.innerHTML = "&nbsp;";
        audio.style.display = "none";

        // Footer row (PLAN.md §4): source badge · More ▾ · settings gear.
        var footer = document.createElement("div");
        footer.style = "border-top: 1px solid #eaecf0; margin: 0 16px; padding: 8px 0 10px; display: flex; align-items: center;";

        var sourceBadge = document.createElement("span");
        sourceBadge.style = "display: none; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #72777d; border: 1px solid #c8ccd1; border-radius: 8px; padding: 1px 7px;";

        var moreToggle = document.createElement("span");
        moreToggle.style = "display: none; cursor: pointer; color: #3366cc; font-size: 13px; margin-left: auto;";
        moreToggle.textContent = "More ▾";

        var settingsGear = document.createElement("span");
        settingsGear.style = "cursor: pointer; font-size: 15px; color: #72777d; margin-left: 12px;";
        settingsGear.textContent = "⚙";
        settingsGear.title = "Lugatic settings";
        settingsGear.addEventListener("click", function () {
            browser.runtime.sendMessage({ type: "open-options" });
        });

        footer.appendChild(sourceBadge);
        footer.appendChild(moreToggle);
        footer.appendChild(settingsGear);

        content.appendChild(heading);
        content.appendChild(phonetic);
        content.appendChild(audio);
        content.appendChild(meaning);
        contentContainer.appendChild(footer);
        document.body.appendChild(hostDiv);

        if(info.clientY < window.innerHeight/2){
            popupDiv.className = "mwe-popups mwe-popups-no-image-tri mwe-popups-is-not-tall";
            hostDiv.style.top = info.bottom + 10 + "px";
            if(info.height == 0){
                hostDiv.style.top = parseInt(hostDiv.style.top) + 8 + "px";
            }
        } else {
            popupDiv.className = "mwe-popups flipped_y mwe-popups-is-not-tall";
            hostDiv.style.top = info.top - 10 - popupDiv.clientHeight + "px";

            if(info.height == 0){
                hostDiv.style.top = parseInt(hostDiv.style.top) - 8 + "px";
            }
        }

        return {
            heading,
            phonetic,
            meaning,
            audio,
            sourceBadge,
            moreToggle,
            content,
            expanded: false
        };

    }

    function getSelectionCoords(selection) {
        var oRange = selection.getRangeAt(0); //get the text range
        var oRect = oRange.getBoundingClientRect();
        return oRect;
    }

    function appendToDiv(createdDiv, content){
        adjustingHeight(createdDiv, function () {
            createdDiv.heading.textContent = content.word;
            renderSenses(createdDiv.meaning, content);

            if (content.phonetic) {
                createdDiv.phonetic.textContent = content.phonetic;
                createdDiv.phonetic.style.display = "inline";
            }

            if (content.source) {
                createdDiv.sourceBadge.textContent = content.source === "local" ? "offline" : "web";
                createdDiv.sourceBadge.style.display = "inline-block";
            }

            if (hasMoreSenses(content)) {
                createdDiv.moreToggle.style.display = "inline";
                createdDiv.moreToggle.addEventListener("click", function () {
                    toggleExpanded(createdDiv, content);
                });
            }
        });

        if(content.audioSrc){
          var sound = document.createElement("audio");
          sound.src = content.audioSrc;
          createdDiv.audio.style.display  = "inline-block";
          createdDiv.audio.addEventListener("click", function(){
            sound.play();
          });
        }
    }

    // Re-measure the popup around a DOM change so a bubble flipped above
    // the selection keeps its bottom edge anchored.
    function adjustingHeight (createdDiv, change) {
        var hostDiv = createdDiv.heading.getRootNode().host;
        var popupDiv = createdDiv.heading.getRootNode().querySelectorAll("div")[1];
        var heightBefore = popupDiv.clientHeight;

        change();

        var difference = popupDiv.clientHeight - heightBefore;
        if (popupDiv.classList.contains("flipped_y")) {
            hostDiv.style.top = parseInt(hostDiv.style.top) - difference + 1 + "px";
        }
    }

    function countSenses (groups) {
        return (groups || []).reduce(function (n, group) {
            return n + group.senses.length;
        }, 0);
    }

    function hasMoreSenses (content) {
        return countSenses(content.fullSenses) > countSenses(content.senses);
    }

    // "More ▾" expands toward ≈520px with internal scroll for the full
    // ranked entry; "Less ▴" restores the collapsed top-senses view (§4).
    function toggleExpanded (createdDiv, content) {
        adjustingHeight(createdDiv, function () {
            createdDiv.expanded = !createdDiv.expanded;

            if (createdDiv.expanded) {
                createdDiv.content.style.maxHeight = "430px";
                createdDiv.content.style.overflowY = "auto";
                createdDiv.moreToggle.textContent = "Less ▴";
            } else {
                createdDiv.content.style.maxHeight = "190px";
                createdDiv.content.style.overflowY = "hidden";
                createdDiv.moreToggle.textContent = "More ▾";
            }

            renderSenses(createdDiv.meaning, content, createdDiv.expanded);
        });
    }

    function renderSenses (container, content, expanded){
        var groups = expanded && content.fullSenses ? content.fullSenses : content.senses;
        container.textContent = "";

        if (!groups || !groups.length) {
            container.textContent = content.meaning;
            return;
        }

        groups.forEach(function(group){
            var posLabel = document.createElement("div");
            posLabel.style = "font-style: italic; color: #666; margin-top: 6px;";
            posLabel.textContent = group.pos;
            container.appendChild(posLabel);

            group.senses.forEach(function(sense, index){
                var line = document.createElement("div");
                line.style = "margin: 2px 0 0 8px;";
                line.textContent = (group.senses.length > 1 ? (index + 1) + ". " : "") + sense.definition;
                container.appendChild(line);
            });
        });
    }

    function noMeaningFound (createdDiv){
      createdDiv.heading.textContent = "Sorry";
      createdDiv.meaning.textContent = "No definition found.";
    }

    function removeMeaning(event){
        var element = event.target;
        if(!element.classList.contains("dictionaryDiv")){
            document.querySelectorAll(".dictionaryDiv").forEach(function(Node){
                Node.remove();
            });
        }
    }

    document.addEventListener('dblclick', ((e) => {
        if (TRIGGER_MODE === 'button') { return; }

        if (TRIGGER_KEY === 'none') {
            return showMeaning(e);
        }

        //e has property altKey, shiftKey, cmdKey representing they key being pressed while double clicking.
        if(e[`${TRIGGER_KEY}Key`]) {
            return showMeaning(e);
        }

        return;
    }));

    document.addEventListener('mouseup', ((e) => {
        // The selection is not final until after mouseup has dispatched.
        window.setTimeout(function () { showTriggerButton(e); }, 0);
    }));

    document.addEventListener('mousedown', ((e) => {
        if (!e.target.classList || !e.target.classList.contains('lugaticTriggerButton')) {
            removeTriggerButton();
        }
    }));

    document.addEventListener('click', removeMeaning);

    document.addEventListener('keydown', ((e) => {
        if (e.key === 'Escape') {
            removeMeaning({ target: document.body });
            removeTriggerButton();
        }
    }));

    function applyInteractionSettings (interaction) {
        interaction = interaction || {};
        TRIGGER_KEY = (interaction.dblClick && interaction.dblClick.key) || DEFAULT_TRIGGER_KEY;
        TRIGGER_MODE = interaction.mode || DEFAULT_TRIGGER_MODE;
    }

    (function () {
        let storageItem = browser.storage.local.get();

        storageItem.then((results) => {
            LANGUAGE = results.language || DEFAULT_LANGUAGE;
            applyInteractionSettings(results.interaction);
        });
    })();

    // Settings saved in the options page take effect without a page reload.
    browser.storage.onChanged.addListener((changes) => {
        if (changes.interaction) {
            applyInteractionSettings(changes.interaction.newValue);
        }
        if (changes.language) {
            LANGUAGE = changes.language.newValue || DEFAULT_LANGUAGE;
        }
    });
