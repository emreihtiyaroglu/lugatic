    var DEFAULT_LANGUAGE = 'en',
        DEFAULT_TRIGGER_KEY = 'none',

        LANGUAGE,
        TRIGGER_KEY;

    function showMeaning (event){
        var createdDiv,
            info = getSelectionInfo(event);

        if (!info) { return; }

        retrieveMeaning(info)
            .then((response) => {                
                if (!response.content) { return noMeaningFound(createdDiv); }

                appendToDiv(createdDiv, response.content);
            });

        // Creating this div while we are fetching meaning to make extension more fast.
        createdDiv = createDiv(info);
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
        content.style = "line-height: 1.4; margin-top: 0px; margin-bottom: 11px; max-height: none";
        contentContainer.appendChild(content);


        var heading = document.createElement("h3");
        heading.style = "margin-block-end: 0px; display:inline-block;";
        heading.textContent = "Searching";

        var meaning = document.createElement("p");
        meaning.style = "margin-top: 10px";
        meaning.textContent = "Please Wait...";

        var audio = document.createElement("div");
        audio.className = "audio";
        audio.innerHTML = "&nbsp;";
        audio.style.display = "none";

        var moreInfo =document.createElement("a");
        moreInfo.href = `https://${LANGUAGE}.wiktionary.org/wiki/${encodeURIComponent(info.word.trim())}`;
        moreInfo.style = "float: right; text-decoration: none;"
        moreInfo.target = "_blank";

        // Source badge (PLAN.md §4): offline dataset vs web API result.
        var sourceBadge = document.createElement("span");
        sourceBadge.style = "display: none; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #72777d; border: 1px solid #c8ccd1; border-radius: 8px; padding: 1px 7px; vertical-align: middle;";

        content.appendChild(heading);
        content.appendChild(audio);
        content.appendChild(meaning);
        content.appendChild(sourceBadge);
        content.appendChild(moreInfo);
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
            meaning,
            moreInfo,
            audio,
            sourceBadge
        };

    }

    function getSelectionCoords(selection) {
        var oRange = selection.getRangeAt(0); //get the text range
        var oRect = oRange.getBoundingClientRect();
        return oRect;
    }

    function appendToDiv(createdDiv, content){
        var hostDiv = createdDiv.heading.getRootNode().host;
        var popupDiv = createdDiv.heading.getRootNode().querySelectorAll("div")[1];

        var heightBefore = popupDiv.clientHeight;
        createdDiv.heading.textContent = content.word;
        renderSenses(createdDiv.meaning, content);
        createdDiv.moreInfo.textContent = "More »";

        if (content.source) {
            createdDiv.sourceBadge.textContent = content.source === "local" ? "offline" : "web";
            createdDiv.sourceBadge.style.display = "inline-block";
        }

        var heightAfter = popupDiv.clientHeight;
        var difference = heightAfter - heightBefore;


        if(popupDiv.classList.contains("flipped_y")){
            hostDiv.style.top = parseInt(hostDiv.style.top) - difference + 1 + "px";
        }

        if(content.audioSrc){
          var sound = document.createElement("audio");
          sound.src = content.audioSrc;
          createdDiv.audio.style.display  = "inline-block";
          createdDiv.audio.addEventListener("click", function(){
            sound.play();
          });
        }
    }

    function renderSenses (container, content){
        container.textContent = "";

        if (!content.senses || !content.senses.length) {
            container.textContent = content.meaning;
            return;
        }

        content.senses.forEach(function(group){
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
        if (TRIGGER_KEY === 'none') {
            return showMeaning(e);
        }

        //e has property altKey, shiftKey, cmdKey representing they key being pressed while double clicking.
        if(e[`${TRIGGER_KEY}Key`]) {
            return showMeaning(e);
        }

        return;
    }));

    document.addEventListener('click', removeMeaning);

    (function () {
        let storageItem = browser.storage.local.get();

        storageItem.then((results) => {
            let interaction = results.interaction || { dblClick: { key: DEFAULT_TRIGGER_KEY }};

            LANGUAGE = results.language || DEFAULT_LANGUAGE;
            TRIGGER_KEY = interaction.dblClick.key;
        });
    })();
