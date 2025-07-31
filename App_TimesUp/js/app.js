let cardPool = []; // Array mit {begriff, erklaerung}

async function loadKartenFromExcel() {
    const filePath = 'js/db_Karten.xlsx'; // Pfad zur Excel-Datei
    try {
        const response = await fetch(filePath);
        const data = await response.arrayBuffer();

        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        cardPool = rows
            .filter(row => row[0] && row[1])
            .map(row => ({ begriff: row[0], erklaerung: row[1] }));


        updateKartenStatusText(`${cardPool.length} Karten erfolgreich geladen`);
    } catch (err) {
        console.error("❌ Fehler beim Laden:", err);
        updateKartenStatusText("❌ Fehler beim Laden der Karten.");
    }
}


let vetoCountPerPlayer = 0;
let remainingVetos = 0;
let cardsWereShown = false; // Steuert, ob Karten bereits angezeigt wurden
let allowCardClick = false; // <== Wichtig: verhindert ungewolltes Durchklicken
let playingCards = []; // Alle Karten, die im Spiel verwendet werden
let showingExplanation = false;
let currentRound = 0;
let totalRounds = 1;




const players = [];

function addPlayer() {
    const input = document.getElementById("playerInput");
    const name = input.value.trim();
    if (name && !players.some(p => p.name === name)) {
        players.push({ name, handicap: false });
        updatePlayerTable();
    }
    input.value = '';
}

function removePlayer(name) {
    const index = players.findIndex(p => p.name === name);
    if (index !== -1) {
        players.splice(index, 1);
        updatePlayerTable();
    }
}

function toggleHandicap(name, checked) {
    const player = players.find(p => p.name === name);
    if (player) player.handicap = checked;
}

function updatePlayerTable() {

    const tbody = document.getElementById("playerTableBody");
    tbody.innerHTML = '';

    players.forEach(p => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.setAttribute("data-label", "Spielername");
        tdName.textContent = p.name;
        tr.appendChild(tdName);

        const tdHandicap = document.createElement("td");
        tdHandicap.setAttribute("data-label", "Handicap");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = p.handicap;
        checkbox.onchange = () => toggleHandicap(p.name, checkbox.checked);
        tdHandicap.appendChild(checkbox);
        tr.appendChild(tdHandicap);

        const tdRemove = document.createElement("td");
        tdRemove.setAttribute("data-label", "Entfernen");
        const btn = document.createElement("button");
        btn.textContent = "❌";
        btn.onclick = () => removePlayer(p.name);
        tdRemove.appendChild(btn);
        tr.appendChild(tdRemove);

        tbody.appendChild(tr);
    });
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(div => div.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
}

function showTab(tabId) {
    if (tabId === "rules") {
        document.getElementById("tab-rules").classList.remove("hidden");
    }
}

function continueToNext() {
    alert("Hier folgt der nächste Bildschirm…");
}

function renderRoundSettings() {
    const roundCount = parseInt(document.getElementById("roundCount").value);
    const container = document.getElementById("roundSettingsContainer");
    container.innerHTML = '';

    const defaultRules = [
        "Nur beschreiben",
        "Nur ein Wort",
        "Pantomime und Geräusche"
    ];

    for (let i = 1; i <= roundCount; i++) {
        // Fallback-Farben für Runden
        const roundColors = [
            "#e0f0ff", // Runde 1 – Hellblau
            "#e2fce2", // Runde 2 – Hellgrün
            "#fff3d6", // Runde 3 – Hellorange
            "#fce2f2", // Runde 4 – Rosa
            "#ede2fc", // Runde 5 – Lila
            "#e2f7fc", // Runde 6 – Türkis
            "#f6e2fc", // Runde 7 – Pink-Violett
            "#fcf3e2", // Runde 8 – Hellgelb
            "#e2fcf0", // Runde 9 – Mint
            "#d9d9d9"  // Runde 10 – Grau (Fallback)
        ];

        const div = document.createElement("div");
        div.classList.add("round-settings");
        div.style.backgroundColor = roundColors[i - 1] || "#f5f5f5"; // Default fallback


        const selectedRule = i <= 3 ? defaultRules[i - 1] : "";
        const defaultSkip = (i === 2) ? "yes" : "no";
        const defaultSkipLimitType = "unlimited";

        const ruleOptions = [
            "Nur beschreiben",
            "Nur ein Wort",
            "Pantomime und Geräusche",
            "Nur einsilbig beschreiben"
        ];

        div.innerHTML = `
        <h4>Runde ${i}</h4>
  
        <label for="rule${i}">Regel</label>
        <select id="rule${i}">
          <option value="">-- bitte auswählen --</option>
          ${ruleOptions.map(rule =>
            `<option value="${rule}" ${selectedRule === rule ? "selected" : ""}>${rule}</option>`
        ).join("")}
        </select>
  
        <label for="timer${i}">Timer (Sekunden)</label>
        <input type="number" id="timer${i}" min="10" value="30" />
  
        <label for="skipAllowed${i}">Überspringen erlaubt?</label>
        <select id="skipAllowed${i}" onchange="toggleSkipOptions(${i})">
          <option value="no" ${defaultSkip === "no" ? "selected" : ""}>Nein</option>
          <option value="yes" ${defaultSkip === "yes" ? "selected" : ""}>Ja</option>
        </select>
  
        <div id="skipOptions${i}" class="${defaultSkip === 'yes' ? '' : 'hidden'}">
          <label for="skipLimitType${i}">Limit:</label>
          <select id="skipLimitType${i}" onchange="toggleSkipLimitValue(${i})">
            <option value="unlimited" selected>Unbegrenzt</option>
            <option value="limited">Maximal erlaubt:</option>
          </select>
          <input type="number" id="skipLimitValue${i}" class="hidden" min="1" value="3" />
        </div>
      `;

        container.appendChild(div);
        // später nach dem Anhängen:
        setTimeout(() => {
            const select = document.getElementById(`skipAllowed${i}`);
            if (select) select.value = defaultSkip;
        }, 0); // falls DOM noch nicht 100 % geladen
    }

}



function toggleSkipOptions(round) {
    const skipAllowed = document.getElementById(`skipAllowed${round}`).value;
    const skipOptions = document.getElementById(`skipOptions${round}`);
    skipOptions.classList.toggle("hidden", skipAllowed !== "yes");

    // Set default values bei Umschalten
    if (skipAllowed === "yes") {
        document.getElementById(`skipLimitType${round}`).value = "unlimited";
        document.getElementById(`skipLimitValue${round}`).classList.add("hidden");
    } else {
        // Reset optional
        document.getElementById(`skipLimitType${round}`).value = "unlimited";
        document.getElementById(`skipLimitValue${round}`).value = 3;
        document.getElementById(`skipLimitValue${round}`).classList.add("hidden");
    }
}


function toggleSkipLimitValue(round) {
    const type = document.getElementById(`skipLimitType${round}`).value;
    const valueField = document.getElementById(`skipLimitValue${round}`);
    if (type === "limited") {
        valueField.classList.remove("hidden");
        valueField.value = 3;
    } else {
        valueField.classList.add("hidden");
    }
}

// Initiale Rundeneinstellungen laden
renderRoundSettings();

function validateSettingsAndGoBack() {
    const roundCount = parseInt(document.getElementById("roundCount").value);

    for (let i = 1; i <= roundCount; i++) {
        const rule = document.getElementById(`rule${i}`);
        if (!rule || !rule.value || rule.value === "") {
            alert(`⚠️ Bitte wähle eine Regel für Runde ${i}.`);
            return; // ⛔️ Sofort abbrechen bei erster ungültiger Regel
        }
    }

    // ✅ Wenn alles gültig → speichern & zurück
    saveSettingsToStorage();
    showScreen("start");
}



function saveSettingsToStorage() {
    const settings = {
      players,
      cardCount: parseInt(document.getElementById("cardCount").value),
      roundCount: parseInt(document.getElementById("roundCount").value),
      roundRules: [],
      roundTimer: [],
      roundSkip: [],
      skipLimitType: [],
      skipLimitValue: [],
      vetoCount: parseInt(document.getElementById("vetoCount").value),
      handicapEnabled: document.getElementById("handicapEnabled").value === "yes",
      handicapTime: parseInt(document.getElementById("handicapTime").value || 5),
      punishEnabled: document.getElementById("punishEnabled").value === "yes",
      punishTime: parseInt(document.getElementById("punishTime").value || 3),
      punishPoints: document.getElementById("punishPoints").value
    };
  
    for (let i = 1; i <= settings.roundCount; i++) {
        const rule = document.getElementById(`rule${i}`).value;
        const timer = parseInt(document.getElementById(`timer${i}`).value);
        const skipAllowed = document.getElementById(`skipAllowed${i}`).value.toLowerCase();
        const skipType = document.getElementById(`skipLimitType${i}`).value.toLowerCase();
      
        const skipValueEl = document.getElementById(`skipLimitValue${i}`);
        let skipLimitValue = 0;
        let skipLimitType = "";
      
        if (skipAllowed === "yes") {
            if (skipType == "unlimited") {
                skipLimitType = "unlimited";
                skipLimitValue = 1000;
             } else if (skipType === "limited") {
                skipLimitType = "limited";
                skipLimitValue = parseInt(skipValueEl.value || 0); // Fallback auf 0
             }
        } else if (skipAllowed === "no") {
          skipLimitType = "limited";
          skipLimitValue = 0;
        }
      
        settings.roundRules.push(rule);
        settings.roundTimer.push(timer);
        settings.roundSkip.push(skipAllowed);
        settings.skipLimitType.push(skipLimitType);
        settings.skipLimitValue.push(skipLimitValue);
      }
      
      
    
      
  
    localStorage.setItem("timesup_settings", JSON.stringify(settings));
  }
  


function exitSettings() {
    saveSettingsToStorage();
    showScreen("start"); // oder wie dein Startbildschirm heißt
}


function loadSettingsFromStorage() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");

    // Allgemeine Einstellungen
    document.getElementById("cardCount").value = settings.cardCount || 40;
    document.getElementById("roundCount").value = settings.roundCount || 3;
    document.getElementById("vetoCount").value = settings.vetoCount || 1;

    // Handicap
    const handicapEnabled = settings.handicapEnabled ? "yes" : "no";
    document.getElementById("handicapEnabled").value = handicapEnabled;
    toggleHandicapInput(); // zeigt oder versteckt Eingabefeld
    document.getElementById("handicapTime").value = settings.handicapTime || 5;

    // Regelmissachtung
    const punishEnabled = settings.punishEnabled ? "yes" : "no";
    document.getElementById("punishEnabled").value = punishEnabled;
    togglePunishOptions(); // zeigt oder versteckt Optionen
    document.getElementById("punishTime").value = settings.punishTime || 3;
    document.getElementById("punishPoints").value = settings.punishPoints || "no";

    // Runden-Einstellungen
    renderRoundSettings(); // erzeugt Felder entsprechend der Rundenanzahl

    for (let i = 1; i <= (settings.roundCount || 3); i++) {
        document.getElementById(`rule${i}`).value = settings.roundRules?.[i - 1] || "";
        document.getElementById(`timer${i}`).value = settings.roundTimer?.[i - 1] || 60;
        document.getElementById(`skipAllowed${i}`).value = settings.roundSkip?.[i - 1] || "Nein";
    }
}


// Beim Start laden
loadSettingsFromStorage();

// Reset-Funktion für alle Einstellungen und Spieler
function resetAllSettings() {
    // Defaults festlegen
    document.getElementById("cardCount").value = 40;
    document.getElementById("roundCount").value = 3;
    document.getElementById("vetoCount").value = 1;

    // Handicap
    document.getElementById("handicapEnabled").value = "no";
    toggleHandicapInput(); // versteckt Eingabefeld
    document.getElementById("handicapTime").value = 5;

    // Regelmissachtung
    document.getElementById("punishEnabled").value = "no";
    togglePunishOptions(); // versteckt Optionen
    document.getElementById("punishTime").value = 3;
    document.getElementById("punishPoints").value = "no";

    // Rundenfelder neu erzeugen
    renderRoundSettings();

    // Standardwerte für 3 Runden setzen
    const defaultRules = ["Nur beschreiben", "Nur ein Wort", "Pantomime und Geräusche"];
    const defaultTimers = [30, 30, 30];
    const defaultSkips = ["Nein", "Ja", "Nein"];

    for (let i = 1; i <= 3; i++) {
        document.getElementById(`rule${i}`).value = defaultRules[i - 1] || "";
        document.getElementById(`timer${i}`).value = defaultTimers[i - 1] || 30;
        document.getElementById(`skipAllowed${i}`).value = defaultSkips[i - 1] || "Nein";
    }

    // Speicher löschen
    localStorage.removeItem("timesup_settings");
}


function toggleHandicapInput() {
    const enabled = document.getElementById("handicapEnabled").value;
    const container = document.getElementById("handicapTimeContainer");
    container.classList.toggle("hidden", enabled !== "yes");
}

// Funktion zum Aktivieren/Deaktivieren der Bestrafungsoptionen
function togglePunishOptions() {
    const enabled = document.getElementById("punishEnabled").value;
    const container = document.getElementById("punishOptionsContainer");
    container.classList.toggle("hidden", enabled !== "yes");
}

// Funktion zum Bestätigen, ob alle Spieler hinzugefügt wurden
function confirmBeforeContinue() {
    const confirmed = confirm("Sind alle Spieler hinzugefügt und alle Einstellungen getroffen?");
    if (confirmed) {
        renderTeamPlayerList(); // <== Spieler laden
        showScreen("teamauswahl");
    }
}

// Funktion zum Rendern der Team-Spielerliste
function renderTeamPlayerList() {
    const tbody = document.getElementById("teamPlayerTableBody");
    tbody.innerHTML = '';
    players.forEach(p => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = p.name;
        tr.appendChild(tdName);

        const tdHandicap = document.createElement("td");
        tdHandicap.textContent = p.handicap ? "✔️" : "–";
        tr.appendChild(tdHandicap);

        tbody.appendChild(tr);
    });
}

function assignRandomTeams() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    teamA = [];
    teamB = [];

    shuffled.forEach((p, i) => {
        if (i % 2 === 0) teamA.push(p);
        else teamB.push(p);
    });

    displayTeams(teamA, teamB);
    showScreen("teamuebersicht");
}


function displayTeams(teamAList, teamBList) {
    const listA = document.getElementById("teamAList");
    const listB = document.getElementById("teamBList");

    // Falls Bildschirm noch nicht geladen oder Element nicht existiert
    if (!listA || !listB) return;

    listA.innerHTML = '';
    listB.innerHTML = '';

    teamAList.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p.name + (p.handicap ? " 🧩" : "");
        li.style.cursor = "pointer";
        li.onclick = () => togglePlayerTeam(p.name);
        listA.appendChild(li);
    });

    teamBList.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p.name + (p.handicap ? " 🧩" : "");
        li.style.cursor = "pointer";
        li.onclick = () => togglePlayerTeam(p.name);
        listB.appendChild(li);
    });
}



let teamA = [];
let teamB = [];

function assignTeamsManually() {
    teamA = [...players];
    teamB = [];
    displayTeams(teamA, teamB);
    showScreen("teamuebersicht");
}


function togglePlayerTeam(name) {
    let playerInA = teamA.find(p => p.name === name);
    let playerInB = teamB.find(p => p.name === name);

    if (playerInA) {
        teamA = teamA.filter(p => p.name !== name);
        teamB.push(playerInA);
    } else if (playerInB) {
        teamB = teamB.filter(p => p.name !== name);
        teamA.push(playerInB);
    }

    displayTeams(teamA, teamB);
}

loadKartenFromExcel();

function updateKartenStatusText(text) {
    const el = document.getElementById("kartenStatusText");
    if (el) el.textContent = text;
}

function startCardSelection(withVeto) {
    // Verteile Karten auf Spieler vorbereiten
    const vetoCardsPerPlayer = parseInt(document.getElementById("vetoCount").value || "1");

    // Spieler in zufälliger Reihenfolge
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    // Zeige den ersten Spieler auf dem Bildschirm
    const current = shuffledPlayers[0];
    document.getElementById("cardSelectionPlayerName").textContent = current.name;

    // TODO: Kartenzuteilung + Weiterlogik folgen später
    showScreen("kartenauswahl");
}

let currentCardPlayerIndex = 0;
let shuffledCardPool = [];
let playerCardCount = 0;

function startCardSelection(withVeto) {
    // Karten gleichmäßig verteilen
    const totalCards = parseInt(document.getElementById("cardCount").value || "40");
    const cardsPerPlayer = Math.floor(totalCards / players.length);

    // Shuffle Karten
    shuffledCardPool = [...cardPool].sort(() => Math.random() - 0.5);

    // Speichern wie viele Karten pro Spieler
    playerCardCount = cardsPerPlayer;
    currentCardPlayerIndex = 0;

    // Veto-Einstellungen laden
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
    vetoCountPerPlayer = settings.vetoCount || 1;


    // Zeige ersten Spieler
    document.getElementById("cardSelectionPlayerName").textContent = players[0].name;
    document.getElementById("cardSelectionInfo").textContent = "Bitte klicken, um die Kartenauswahl zu starten!";
    document.getElementById("cardSelectionList").innerHTML = "";
    document.getElementById("vetoInfoText").textContent = "";
    document.getElementById("cardDoneButton").style.display = "none";

    cardsWereShown = false;
    allowCardClick = true;
    showScreen("kartenauswahl");
}

function handleCardSelectionClick() {
    if (cardsWereShown || !allowCardClick) return;

    const ul = document.getElementById("cardSelectionList");
    const info = document.getElementById("cardSelectionInfo");
    const vetoInfo = document.getElementById("vetoInfoText");

    const cardsForPlayer = shuffledCardPool.splice(0, playerCardCount);
    remainingVetos = vetoCountPerPlayer;
    cardsWereShown = true;

    cardsForPlayer.forEach((card, index) => {
        const li = document.createElement("li");
        li.innerHTML = `<span style="background: #ddd; padding: 2px 6px; border-radius: 6px;">${card.begriff}</span> – ${card.erklaerung}`;
        li.style.padding = "8px";
        li.style.borderBottom = "1px solid #ccc";
        li.style.cursor = "pointer";
        li.onclick = () => handleCardVeto(li, index);
        ul.appendChild(li);
    });

    info.textContent = `Deine ${playerCardCount} Karten:`;
    updateVetoDisplay();

    const doneBtn = document.getElementById("cardDoneButton");
    if (doneBtn) doneBtn.style.display = "inline-block";
}






function updateVetoDisplay() {
    const el = document.getElementById("vetoInfoText");
    if (el) {
        el.textContent = `Du hast ${remainingVetos} Veto${remainingVetos !== 1 ? 's' : ''}`;
    }
}


function handleCardVeto(listItem, index) {
    if (remainingVetos <= 0) {
        alert("Du hast keine Vetos mehr.");
        return;
    }

    const confirmVeto = confirm("Willst du wirklich ein Veto verwenden, um diese Karte auszutauschen?");
    if (!confirmVeto) return;

    if (shuffledCardPool.length === 0) {
        alert("Es sind keine Karten mehr verfügbar.");
        return;
    }

    // Neue Karte ziehen und anzeigen
    const newCard = shuffledCardPool.shift();
    listItem.textContent = `🃏 ${newCard.begriff} – ${newCard.erklaerung}`;

    // Deaktivieren, damit keine 2. Aktion mehr möglich ist
    listItem.onclick = null;
    listItem.style.opacity = "0.6"; // Optional: Visuelles Feedback
    listItem.style.pointerEvents = "none";

    // Veto runterzählen
    remainingVetos--;

    updateVetoDisplay();


    // Anzeige aktualisieren
    document.getElementById("vetoInfoText").textContent =
        `Du hast ${remainingVetos} Veto${remainingVetos !== 1 ? 's' : ''}`;
}

function handleCardSelectionDone() {
    document.getElementById("startGameOverviewButton").style.display = "none";

    if (remainingVetos > 0) {
        const confirmFinish = confirm(`Du hast noch ${remainingVetos} Veto${remainingVetos !== 1 ? 's' : ''} übrig. Möchtest du wirklich fortfahren?`);
        if (!confirmFinish) return;
    }

    const ul = document.getElementById("cardSelectionList");
    const playerLabel = document.getElementById("cardSelectionPlayerName");
    const info = document.getElementById("cardSelectionInfo");
    const vetoInfo = document.getElementById("vetoInfoText");
    const doneBtn = document.getElementById("cardDoneButton");


    // ✅ Karten des aktuellen Spielers speichern (nach Vetos)
    for (let i = 0; i < ul.children.length; i++) {
        const cardText = ul.children[i].textContent;
        const clean = cardText.replace(/^🃏\s*/, "").split(" – ");
        if (clean.length === 2) {
            playingCards.push({
                begriff: clean[0].trim(),
                erklaerung: clean[1].trim()
            });
        }
    }

    currentCardPlayerIndex++;

    if (currentCardPlayerIndex >= players.length) {
        // Alle Spieler durch – fehlende Karten berechnen
        const targetCount = parseInt(document.getElementById("cardCount").value || "40");
        const fehlendeKarten = Math.max(0, targetCount - playingCards.length);

        // Restliche Karten zufällig hinzufügen (ohne Doppelung)
        for (let i = 0; i < fehlendeKarten && shuffledCardPool.length > 0; i++) {
            const card = shuffledCardPool.shift();
            playingCards.push({
                begriff: card.begriff,
                erklaerung: card.erklaerung
            });
        }

        // Ausgabe
        playerLabel.textContent = "✓ Fertig!";
        info.textContent = `Alle Spieler haben ihre Karten. Gesamt: ${playingCards.length} Karten. Davon ${fehlendeKarten} automatisch ergänzt.`;
        vetoInfo.textContent = "";
        ul.innerHTML = "";
        doneBtn.style.display = "none";
        allowCardClick = false;

        document.getElementById("startGameOverviewButton").style.display = "inline-block";

        return;
    }


    // 🔄 Nächster Spieler vorbereiten
    playerLabel.textContent = players[currentCardPlayerIndex].name;
    info.textContent = "Bitte klicken, um die Kartenauswahl zu starten!";
    vetoInfo.textContent = "";
    ul.innerHTML = "";
    doneBtn.style.display = "none";
    cardsWereShown = false;

    // ✋ kleinen Klickpuffer einbauen, damit kein Doppelklick passiert
    allowCardClick = false;
    setTimeout(() => { allowCardClick = true; }, 100);
}

function startCardSelectionWithoutVeto() {
    const totalCards = parseInt(document.getElementById("cardCount").value || "40");

    // Karten mischen
    shuffledCardPool = [...cardPool].sort(() => Math.random() - 0.5);

    // Karten ohne Doppelung auswählen
    playingCards = shuffledCardPool.slice(0, totalCards);

    // Anzeige vorbereiten
    const playerLabel = document.getElementById("cardSelectionPlayerName");
    const info = document.getElementById("cardSelectionInfo");
    const vetoInfo = document.getElementById("vetoInfoText");
    const ul = document.getElementById("cardSelectionList");
    const doneBtn = document.getElementById("cardDoneButton");

    playerLabel.textContent = "✓ Karten automatisch ausgewählt";
    info.textContent = `${playingCards.length} Karten wurden zufällig ausgewählt.`;
    vetoInfo.textContent = "";
    ul.innerHTML = "";
    doneBtn.style.display = "none";

    document.getElementById("startGameOverviewButton").style.display = "inline-block";

    showScreen("kartenauswahl");
}

function prepareGameOverview() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
    const rounds = parseInt(settings.roundCount || 3);

    console.log("📦 Einstellungen:", settings);


    // 1. 🎯 Rundenübersicht
    const roundEl = document.getElementById("roundSummary");
    if (roundEl) {
        roundEl.textContent = `Es werden ${rounds} Runden gespielt. Bisher 0 abgeschlossen.`;
    }

    // 2. 📋 Allgemeine Regeln
    const general = document.getElementById("generalRulesList");
    if (general) {
        general.innerHTML = "";

        general.innerHTML += `<li>🃏 Anzahl Karten: ${settings.cardCount || 40}</li>`;
        general.innerHTML += `<li>🔁 Spielrunden: ${rounds}</li>`;
        general.innerHTML += `<li>🧩 Handicap: ${settings.handicapEnabled ? 'Ja, +' + (settings.handicapTime || 5) + 's' : 'Nein'}</li>`;

        if (settings.punishEnabled) {
            general.innerHTML += `<li>⚠️ Regelmissachtung: Ja<br>
          ⏱️ Strafzeit: ${settings.punishTime || 3}s<br>
          ❌ Punktabzug: ${settings.punishPoints || 'Nein'}</li>`;
        } else {
            general.innerHTML += `<li>⚠️ Regelmissachtung: Nein</li>`;
        }
    }

    // 3. 🎯 Regeln je Runde
    const roundWrap = document.getElementById("overviewRoundSettings");
    if (roundWrap) {
        roundWrap.innerHTML = "";

        for (let i = 0; i < rounds; i++) {
            const rule = settings.roundRules?.[i] || "-";
            const timer = settings.roundTimer?.[i] || "?";
            const skip = settings.roundSkip?.[i] || "Nein";

            const box = document.createElement("div");
            box.style.border = `2px solid var(--rcolor${i})`;
            box.style.background = `var(--rbg${i})`;
            box.style.borderRadius = "12px";
            box.style.padding = "10px";
            box.style.marginBottom = "10px";
            box.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
            box.style.color = "#222";

            box.innerHTML = `
          <strong>Runde ${i + 1}</strong><br>
          Regel: ${rule}<br>
          Zeit: ${timer} Sekunden<br>
          Überspringen: ${skip}
        `;

            roundWrap.appendChild(box);
        }
    }


    // 4. 👥 Teamzuordnung
    const listA = document.getElementById("overviewTeamA");
    const listB = document.getElementById("overviewTeamB");
    if (listA && listB) {
        listA.innerHTML = "";
        listB.innerHTML = "";

        teamA.forEach(p => {
            const li = document.createElement("li");
            li.textContent = p.name + (p.handicap ? " 🧩" : "");
            listA.appendChild(li);
        });

        teamB.forEach(p => {
            const li = document.createElement("li");
            li.textContent = p.name + (p.handicap ? " 🧩" : "");
            listB.appendChild(li);
        });
    }

    // 5. 🏆 Punktestand zurücksetzen
    const teamATitle = document.getElementById("teamATitle");
    const teamBTitle = document.getElementById("teamBTitle");
    if (teamATitle) teamATitle.textContent = "🔴 Team A – 0 Punkte";
    if (teamBTitle) teamBTitle.textContent = "🟢 Team B – 0 Punkte";

    // ✅ Bildschirm anzeigen
    showScreen("spieluebersicht");
}


// Funktion zum Starten des Spiels
function startGame() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
totalRounds = parseInt(settings.roundCount || 3);
currentRound = 0;

    // 1. Kopiere Karten
    currentCards = [...playingCards];
  
    // 2. Bestimme Startteam
    let startingTeam;
    if (teamA.length < teamB.length) {
      startingTeam = "A";
    } else if (teamB.length < teamA.length) {
      startingTeam = "B";
    } else {
      startingTeam = Math.random() < 0.5 ? "A" : "B";
    }
  
    // 3. Setze aktiven Spieler (erster aus Team)
    activeTeam = startingTeam;
    activePlayerIndex = 0;
    activePlayer = (startingTeam === "A") ? teamA[0] : teamB[0];
  
    // 4. Initialisiere Rundendaten
    //currentRound = 0;
    currentRoundCards = [...currentCards]; // aktuelle Karten pro Runde
    correctCards = { A: [], B: [] };
    usedCardsThisTurn = [];
    teamMistakes = { A: 0, B: 0 };
  
    // 5. Zeige Spieleranzeige zum Start
    showStartRoundScreen();
  }
  

  function showStartRoundScreen() {
    document.getElementById("roundPlayerName").textContent = activePlayer.name;
    document.getElementById("roundPlayerTeam").textContent = `Team ${activeTeam}`;
    document.getElementById("roundPlayerTeam").style.color = (activeTeam === "A") ? "red" : "green";
  
    showScreen("roundstart");
  }
  
  // Funktion zum Starten der Runde
  let timer;
  let remainingTime = 0;
  let displayedCards = [];
  let skipCounter = 0;
  let activePlayerIndexA = 0;
  let activePlayerIndexB = 0;
  let isPenaltyActive = false;
  let totalPoints = { A: 0, B: 0 }; // bleibt über alle Runden erhalten



  
  function startRoundTimer() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
  
    const roundIndex = currentRound; // z. B. 0, 1, 2 …
    let baseTime = parseInt(settings.roundTimer?.[roundIndex] || 60);
  
    // Handicap-Zeit
    if (settings.handicapEnabled && activePlayer.handicap) {
      baseTime += parseInt(settings.handicapTime || 5);
    }
  
    remainingTime = baseTime;
    displayedCards = [];
    skipCounter = 0;
  
    document.getElementById("playRoundPlayer").textContent = activePlayer.name;
    document.getElementById("playRoundTeam").textContent = `Team ${activeTeam}`;
    document.getElementById("timerDisplay").textContent = `${remainingTime}s`;
  
    showScreen("play");
  
    // Starte Timer
    timer = setInterval(() => {
      remainingTime--;
      document.getElementById("timerDisplay").textContent = `${remainingTime}s`;
  
      if (remainingTime <= 0) {
        clearInterval(timer);
        endRound();
      }
    }, 1000);
  
    showNextCard(); // Los geht’s
  }
  
  
  

// Funktion nächste Karte
function showNextCard() {
    const available = currentCards.filter(card => !displayedCards.includes(card.begriff));
    if (available.length === 0) {
      document.getElementById("cardTerm").textContent = "🔄 Keine weiteren Karten";
      document.getElementById("cardExplanation").style.display = "none";
      endRound();
      return;
    }
  
    const next = available[Math.floor(Math.random() * available.length)];
    currentCard = next;
    displayedCards.push(next.begriff);
  
    document.getElementById("cardTerm").textContent = currentCard.begriff;
    document.getElementById("cardExplanation").textContent = currentCard.erklaerung || "";
    document.getElementById("cardExplanation").style.display = "none";
    showingExplanation = false;
  
  // ✅ Button-Zustand anpassen
  setActionButtonsEnabled(true); // ✅ Jetzt wieder freischalten
  updateSkipButtonState();
  }

  function handleCorrect() {
    if (!currentCard) return;
  
    // Speichere richtige Karte für das Team
    correctCards[activeTeam].push(currentCard);
  
    // Entferne die Karte aus currentCards
    currentCards = currentCards.filter(card => card.begriff !== currentCard.begriff);
  
    // Nächste Karte anzeigen
    showingExplanation = false; // zurücksetzen bei neuer Karte
    showNextCard();
  }

  function handleSkip() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
    const roundIndex = currentRound;
  
    const skipSetting = settings.roundSkip?.[roundIndex];
    const skipAllowed = skipSetting === "yes";
  
    if (!skipAllowed) return;
  
    // Prüfen auf Limit
    if (skipSetting === "yes") {
      const maxSkips = parseInt(settings.skipLimitValue?.[roundIndex] || 100);
      if (skipCounter >= maxSkips) return;
    }
  
    // Karte als angezeigt merken
    displayedCards.push(currentCard.begriff);
    skipCounter++;
  
    // Nächste Karte anzeigen
    showNextCard();
  }
  
  function handleMistake() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
  
    // Wenn bereits Strafzeit läuft, nichts tun
    if (isPenaltyActive) return;
  
    // Fehler zählen
    teamMistakes[activeTeam] = (teamMistakes[activeTeam] || 0) + 1;
    displayedCards.push(currentCard.begriff); // Karte darf nicht nochmal kommen
  
    // Prüfen auf Strafzeit
    if (settings.punishEnabled) {
      const delay = parseInt(settings.punishTime || 3);
      isPenaltyActive = true;
  
      document.getElementById("cardTerm").textContent = "⏱️ Strafzeit…";
      setActionButtonsEnabled(false);
      // Nach Ablauf wieder Karte anzeigen
      setTimeout(() => {
        isPenaltyActive = false;
        showNextCard();
      }, delay * 1000);
    } else {
      showNextCard();
    }
  }
  
  
  function updateSkipButtonState() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
    const roundIndex = currentRound;
  
    const skipSetting = (settings.roundSkip?.[roundIndex] || "no").toLowerCase();
    const skipBtn = document.getElementById("btnSkip");
  
    console.log("🎯 Skip-Setting für Runde", roundIndex + 1, "ist:", skipSetting);
    console.log("🔁 skipCounter =", skipCounter);
    console.log("Skip_Limit_Value für Runde", roundIndex + 1, "ist:", settings.skipLimitValue?.[roundIndex]);
  
    // 1. Wenn nicht erlaubt
    if (skipSetting === "no") {
      skipBtn.disabled = true;
      skipBtn.style.background = "#ccc";
      return;
    }
  
    // 2. Wenn maximal erlaubt
    if (skipSetting === "yes") {
      const maxSkips = parseInt(settings.skipLimitValue?.[roundIndex] || 100);
      if (skipCounter >= maxSkips) {
        skipBtn.disabled = true;
        skipBtn.style.background = "#ccc";
        return;
      }
    }
  
    // 3. Wenn erlaubt (auch "unbegrenzt")
    skipBtn.disabled = false;
    skipBtn.style.background = "#f39c12";
  }
  
  
  
  function toggleExplanation() {
    if (!currentCard) return;
  
    const explanationEl = document.getElementById("cardExplanation");
  
    showingExplanation = !showingExplanation;
    explanationEl.style.display = showingExplanation ? "block" : "none";
  }
  
  function setNextPlayer() {
    // Wechsle das Team
    activeTeam = (activeTeam === "A") ? "B" : "A";
  
    if (activeTeam === "A") {
      activePlayer = teamA[activePlayerIndexA % teamA.length];
      activePlayerIndexA++;
    } else {
      activePlayer = teamB[activePlayerIndexB % teamB.length];
      activePlayerIndexB++;
    }
  }
  
  function endRound() {
    clearInterval(timer);
  
    // Noch Karten übrig → Nächster Spieler
    if (currentCards.length > 0) {
      setNextPlayer();
      showStartRoundScreen(); // Anzeigen „Tippen zum Starten“
    } else {
      showRoundStats(); // Neue Funktion
    }
  }
  
  
  function showRoundStats() {
    document.getElementById("statsRoundNumber").textContent = currentRound + 1;
  
    // Punkte der Runde
    const pointsA = correctCards.A.length;
    const pointsB = correctCards.B.length;
  
    // Aufaddieren
    totalPoints.A += pointsA;
    totalPoints.B += pointsB;
  
    // Anzeige der Gesamtpunkte
    document.getElementById("pointsTeamA").textContent = totalPoints.A;
    document.getElementById("pointsTeamB").textContent = totalPoints.B;
  
    showScreen("roundstats");
  }
  
  
  function nextGameRound() {
    const settings = JSON.parse(localStorage.getItem("timesup_settings") || "{}");
  
    currentRound++;
  
    // Wenn alle Runden gespielt → Spielende anzeigen
    if (currentRound >= totalRounds) {
      showFinalScreen(); // TODO
      return;
    }
  
    // NEU: Karten vollständig neu kopieren und mischen
    currentCards = [...playingCards];
    displayedCards = [];
  
    // Reset nur für aktuelle Runde
    correctCards = { A: [], B: [] };
    teamMistakes = { A: 0, B: 0 };
    skipCounter = 0;
  
    // activePlayerIndexA/B bleiben wie sie sind
    setNextPlayer(); // Nächster Spieler, Reihenfolge fortsetzen
    showStartRoundScreen();
  }
  
  

  function showFinalScreen() {
    alert("🎉 Das Spiel ist beendet!"); // Platzhalter
  
    // TODO: Du kannst hier noch einen Finalbildschirm einbauen mit Gesamtpunkten
  }
  
  function setActionButtonsEnabled(enabled) {
    document.getElementById("btnCorrect").disabled = !enabled;
    document.getElementById("btnMistake").disabled = !enabled;
  }
  
  
  function confirmStartRound() {
    if (confirm("Bist du bereit, deinen Timer zu starten?\nDeine Zeit beginnt sofort.")) {
      startRoundTimer();
    }
  }
  

  function showFinalScreen() {
    // Punkte anzeigen
    document.getElementById("finalPointsA").textContent = totalPoints.A || 0;
    document.getElementById("finalPointsB").textContent = totalPoints.B || 0;
  
    // Tabellen befüllen
    const listA = document.getElementById("finalTeamA");
    const listB = document.getElementById("finalTeamB");
    listA.innerHTML = "";
    listB.innerHTML = "";
  
    teamA.forEach(player => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="padding: 4px 12px;">${player.name}</td>
        <td style="text-align: center;">${player.handicap ? "✔️" : ""}</td>
      `;
      listA.appendChild(row);
    });
  
    teamB.forEach(player => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="padding: 4px 12px;">${player.name}</td>
        <td style="text-align: center;">${player.handicap ? "✔️" : ""}</td>
      `;
      listB.appendChild(row);
    });
  
    showScreen("end");
  }
  
  