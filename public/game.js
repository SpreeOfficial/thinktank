// ─── GAME CLIENT ───
const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId") || params.get("lobby");
let myId = null;
let currentSentence = "";
let blanksNeeded = 0;
let selectedCards = [];
let currentHand = [];
let hasSubmitted = false;
let hasVoted = false;

// DOM refs
const timerEl = document.getElementById("timer");
const phaseLabelEl = document.getElementById("phaseLabel");
const roundLabelEl = document.getElementById("roundLabel");
const sentenceEl = document.getElementById("sentence");
const handEl = document.getElementById("hand");
const playAreaEl = document.getElementById("playArea");
const submitAreaEl = document.getElementById("submitArea");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const votingEl = document.getElementById("voting");
const resultsEl = document.getElementById("results");
const sidebarPlayersEl = document.getElementById("sidebarPlayers");

// ─── RECONNECT ───
myId = localStorage.getItem("playerId");
const nickname = localStorage.getItem("nickname") || "Player";
socket.emit("joinLobby", { lobbyId, nickname, playerId: myId }, (res) => {
    if (res && res.playerId) {
        myId = res.playerId;
        localStorage.setItem("playerId", myId);
    }
});

// ─── SIDEBAR: Player list & scores ───
socket.on("playerStatus", ({ players }) => {
    if (!sidebarPlayersEl) return;
    sidebarPlayersEl.innerHTML = "";
    // Sort by score desc
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    sorted.forEach((p, i) => {
        const li = document.createElement("li");
        li.className = "sidebar-player";
        if (p.id === myId) li.classList.add("me");

        const medal = i === 0 && p.score > 0 ? "🥇 " : i === 1 && p.score > 0 ? "🥈 " : i === 2 && p.score > 0 ? "🥉 " : "";
        const readyIcon = p.ready ? '<span class="ready-icon">✅</span>' : "";

        li.innerHTML =
            '<div class="sidebar-player-info">' +
                '<span class="sidebar-nick">' + medal + escapeHtml(p.nickname) + '</span>' +
                readyIcon +
            '</div>' +
            '<span class="sidebar-score">' + (p.score || 0) + ' pts</span>';
        sidebarPlayersEl.appendChild(li);
    });
});

// ─── TIMER ───
socket.on("tick", ({ timeLeft }) => {
    timerEl.textContent = timeLeft + "s";
    if (timeLeft <= 15) {
        timerEl.classList.add("warning");
    } else {
        timerEl.classList.remove("warning");
    }
});

// ─── ROUND START (Play Phase) ───
socket.on("roundStart", ({ round, sentence, blanksNeeded: bn, hand, timeLeft }) => {
    currentSentence = sentence;
    blanksNeeded = bn;
    selectedCards = [];
    currentHand = [...hand];
    hasSubmitted = false;
    hasVoted = false;

    phaseLabelEl.textContent = "Pick " + blanksNeeded + " card" + (blanksNeeded > 1 ? "s" : "");
    roundLabelEl.innerHTML = 'Round ' + round;
    roundLabelEl.style.display = "inline-block";

    // Show sentence
    sentenceEl.style.display = "block";
    renderSentence();

    // Show hand
    renderHand();

    // Show submit area, reset button
    submitAreaEl.style.display = "block";
    submitBtn.disabled = true;
    submitBtn.classList.remove("ready-submitted");
    submitBtnText.textContent = "I'm Ready!";

    // Hide other sections
    playAreaEl.style.display = "block";
    votingEl.style.display = "none";
    resultsEl.style.display = "none";

    timerEl.textContent = timeLeft + "s";
    timerEl.classList.remove("warning");
});

// ─── RENDER SENTENCE with clickable blanks ───
function renderSentence() {
    let html = currentSentence;
    let i = 0;
    html = html.replace(/___/g, () => {
        const idx = i;
        const card = selectedCards[idx];
        i++;
        if (card) {
            return '<span class="blank filled" data-blank-idx="' + idx + '">' + escapeHtml(card) + '</span>';
        }
        return '<span class="blank empty">&nbsp;&nbsp;&nbsp;</span>';
    });
    sentenceEl.innerHTML = html;

    // Add click handlers on filled blanks to remove cards
    sentenceEl.querySelectorAll(".blank.filled").forEach(el => {
        el.addEventListener("click", () => {
            if (hasSubmitted) return;
            const blankIdx = parseInt(el.getAttribute("data-blank-idx"));
            removeCardFromBlank(blankIdx);
        });
    });
}

// ─── REMOVE CARD from blank back to hand ───
function removeCardFromBlank(blankIdx) {
    if (blankIdx < 0 || blankIdx >= selectedCards.length) return;
    const card = selectedCards[blankIdx];
    if (!card) return;
    // Remove from selected
    selectedCards.splice(blankIdx, 1);
    // Add back to hand
    currentHand.push(card);
    renderHand();
    renderSentence();
    updateSubmitButton();
}

// ─── RENDER HAND ───
function renderHand() {
    handEl.innerHTML = "";
    currentHand.forEach(cardText => {
        const div = document.createElement("div");
        div.className = "card";
        div.textContent = cardText;
        if (selectedCards.includes(cardText)) {
            div.classList.add("selected");
        }
        if (hasSubmitted) {
            div.classList.add("disabled");
        }
        div.onclick = () => {
            if (hasSubmitted) return;
            toggleCard(cardText);
        };
        handEl.appendChild(div);
    });
}

// ─── TOGGLE CARD selection ───
function toggleCard(cardText) {
    const idx = selectedCards.indexOf(cardText);
    if (idx !== -1) {
        // Deselect: remove from selected, add back to hand
        selectedCards.splice(idx, 1);
    } else {
        if (selectedCards.length >= blanksNeeded) {
            // At max, pop the first selected card back into hand
            const removed = selectedCards.shift();
            currentHand.push(removed);
        }
        selectedCards.push(cardText);
        // Remove from hand display
        const handIdx = currentHand.indexOf(cardText);
        if (handIdx !== -1) currentHand.splice(handIdx, 1);
    }
    renderHand();
    renderSentence();
    updateSubmitButton();
}

function updateSubmitButton() {
    submitBtn.disabled = selectedCards.length !== blanksNeeded;
}

// ─── SUBMIT / READY ───
function submitCards() {
    if (hasSubmitted || selectedCards.length !== blanksNeeded) return;
    socket.emit("submitCards", { lobbyId, cards: [...selectedCards] });
}

socket.on("submitAck", () => {
    hasSubmitted = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("ready-submitted");
    submitBtnText.textContent = "✔ Ready!";
    phaseLabelEl.textContent = "Waiting for other players...";
    // Disable hand cards
    handEl.querySelectorAll(".card").forEach(c => c.classList.add("disabled"));
});

// ─── VOTE PHASE ───
socket.on("votePhase", ({ submissions, myId: serverMyId, timeLeft }) => {
    myId = serverMyId || myId;
    hasVoted = false;

    phaseLabelEl.textContent = "Vote for your favorite!";
    playAreaEl.style.display = "none";
    resultsEl.style.display = "none";
    votingEl.style.display = "block";
    votingEl.innerHTML = "";

    if (submissions.length === 0) {
        votingEl.innerHTML = '<p class="waiting-msg">No one submitted an answer this round!</p>';
        return;
    }

    submissions.forEach(sub => {
        const div = document.createElement("div");
        div.className = "vote-option";
        div.innerHTML = sub.filledSentence;
        const isMine = sub.ownerId === myId;
        if (isMine) {
            div.classList.add("mine");
            const tag = document.createElement("div");
            tag.className = "mine-tag";
            tag.textContent = "Your answer";
            div.appendChild(tag);
        }
        div.onclick = () => {
            if (hasVoted || isMine) return;
            hasVoted = true;
            document.querySelectorAll(".vote-option").forEach(el => el.classList.remove("voted"));
            div.classList.add("voted");
            socket.emit("vote", { lobbyId, votedForId: sub.ownerId });
        };
        votingEl.appendChild(div);
    });

    timerEl.textContent = timeLeft + "s";
    timerEl.classList.remove("warning");
});

socket.on("voteAck", () => {
    phaseLabelEl.textContent = "Vote placed! Waiting for others...";
});

// ─── ROUND RESULTS ───
socket.on("roundResults", ({ round, roundWinner, results }) => {
    phaseLabelEl.textContent = "Round " + round + " Results";
    playAreaEl.style.display = "none";
    votingEl.style.display = "none";
    timerEl.textContent = "";
    resultsEl.style.display = "block";
    resultsEl.innerHTML = "";

    if (roundWinner) {
        const winnerDiv = document.createElement("div");
        winnerDiv.className = "center mb10";
        winnerDiv.innerHTML = '<h2 style="color:gold;">🏆 ' + escapeHtml(roundWinner) + ' wins the round!</h2>';
        resultsEl.appendChild(winnerDiv);
    }

    const listDiv = document.createElement("div");
    listDiv.className = "results-list";
    const sorted = [...results].sort((a, b) => b.roundPoints - a.roundPoints);
    sorted.forEach(r => {
        const item = document.createElement("div");
        item.className = "result-item";
        if (r.nickname === roundWinner) item.classList.add("winner");
        item.innerHTML =
            '<div class="answer">' + r.filledSentence + '</div>' +
            '<div class="meta">' +
            '<span>' + escapeHtml(r.nickname) + '</span>' +
            '<span>+' + r.roundPoints + ' vote' + (r.roundPoints !== 1 ? 's' : '') + '</span>' +
            '</div>';
        listDiv.appendChild(item);
    });
    resultsEl.appendChild(listDiv);

    // Countdown to next round
    let countdown = 10;
    const nextDiv = document.createElement("div");
    nextDiv.className = "next-round-timer";
    nextDiv.textContent = "Next round in " + countdown + "s...";
    resultsEl.appendChild(nextDiv);
    const cdInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(cdInterval);
            nextDiv.textContent = "Starting...";
        } else {
            nextDiv.textContent = "Next round in " + countdown + "s...";
        }
    }, 1000);
});

// ─── HELPERS ───
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Handle if already on game page
socket.on("gameStarted", () => {
    // Already here, wait for roundStart
});

socket.on("errorMsg", (data) => {
    const toast = document.createElement("div");
    toast.className = "error-toast";
    toast.textContent = data.msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});
