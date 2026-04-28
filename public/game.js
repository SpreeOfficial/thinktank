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
let gameStateReceived = false;
let hostId = null;

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

if (!lobbyId) {
    alert("Missing lobbyId");
    window.location.href = "/";
}

// ─── RECONNECT: join lobby, then request game state ───
myId = localStorage.getItem("playerId");
const nickname = localStorage.getItem("nickname") || "Player";

socket.on("connect", () => {
    console.log("[game] socket connected, joining lobby...");
    socket.emit("joinLobby", { lobbyId, nickname, playerId: myId }, (res) => {
        if (res && res.error) {
            console.error("[game] joinLobby error:", res.error);
            alert(res.error);
            window.location.href = "/";
            return;
        }
        if (res && res.playerId) {
            myId = res.playerId;
            localStorage.setItem("playerId", myId);
        }
        console.log("[game] joined lobby, myId:", myId);

        // Start polling for game state until we receive it
        startGameStatePolling();
    });
});

let _pollInterval = null;
function startGameStatePolling() {
    if (_pollInterval) return;
    // First attempt after 1 second, then every 2 seconds
    _pollInterval = setInterval(() => {
        if (gameStateReceived) {
            clearInterval(_pollInterval);
            _pollInterval = null;
            return;
        }
        console.log("[game] polling requestGameState...");
        socket.emit("requestGameState", { lobbyId }, handleGameState);
    }, 1500);
}

// ─── Handle game state from requestGameState ───
function handleGameState(state) {
    console.log("[game] received game state:", state?.phase);
    if (!state || state.error) return;

    if (state.phase === "waiting") {
        // Game hasn't started round yet, keep polling
        phaseLabelEl.textContent = "Starting soon...";
        return;
    }
    if (state.phase === null) {
        // No game yet
        phaseLabelEl.textContent = "Waiting for game...";
        return;
    }
    if (state.phase === "playing" && !gameStateReceived) {
        // Manually trigger the roundStart handler
        handleRoundStart({
            round: state.round,
            sentence: state.sentence,
            blanksNeeded: state.blanksNeeded,
            hand: state.hand,
            timeLeft: state.timeLeft,
        });
        if (state.alreadySubmitted) {
            hasSubmitted = true;
            submitBtn.disabled = true;
            submitBtn.classList.add("ready-submitted");
            submitBtnText.textContent = "✔ Ready!";
            phaseLabelEl.textContent = "Waiting for other players...";
            handEl.querySelectorAll(".card").forEach(c => c.classList.add("disabled"));
        }
    }
    if (state.phase === "voting" && !gameStateReceived) {
        handleVotePhase({
            submissions: state.submissions,
            myId: state.myId,
            timeLeft: state.timeLeft,
        });
        if (state.alreadyVoted) {
            hasVoted = true;
            phaseLabelEl.textContent = "Vote placed! Waiting for others...";
        }
    }
}

// ─── SIDEBAR: Player list & scores from playerStatus ───
socket.on("playerStatus", ({ players, hostId: hid }) => {
    if (hid) hostId = hid;
    renderSidebar(players);
});

// ─── SIDEBAR: Also populate from lobbyUpdate (initial load) ───
socket.on("lobbyUpdate", (lobby) => {
    if (!lobby || !lobby.players) return;
    if (lobby.hostId) hostId = lobby.hostId;
    const players = Object.entries(lobby.players).map(([pid, p]) => ({
        id: pid,
        nickname: p.nickname,
        score: 0,
        ready: false,
    }));
    renderSidebar(players);
});

function renderSidebar(players) {
    if (!sidebarPlayersEl) return;
    sidebarPlayersEl.innerHTML = "";
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const isHost = myId === hostId;
    sorted.forEach((p, i) => {
        const li = document.createElement("li");
        li.className = "sidebar-player";
        if (p.id === myId) li.classList.add("me");

        const medal = i === 0 && p.score > 0 ? "🥇 " : i === 1 && p.score > 0 ? "🥈 " : i === 2 && p.score > 0 ? "🥉 " : "";
        const readyIcon = p.ready ? '<span class="ready-icon">✅</span>' : "";

        // Kick button for host (not on themselves)
        let kickBtn = "";
        if (isHost && p.id !== myId) {
            kickBtn = '<button class="btn-kick" data-pid="' + p.id + '" title="Kick player">✕</button>';
        }

        li.innerHTML =
            '<div class="sidebar-player-info">' +
                '<span class="sidebar-nick">' + medal + escapeHtml(p.nickname) + '</span>' +
                readyIcon +
            '</div>' +
            '<div class="sidebar-player-right">' +
                '<span class="sidebar-score">' + (p.score || 0) + ' pts</span>' +
                kickBtn +
            '</div>';
        sidebarPlayersEl.appendChild(li);
    });

    // Attach kick button event listeners
    if (isHost) {
        sidebarPlayersEl.querySelectorAll(".btn-kick").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const pid = btn.getAttribute("data-pid");
                if (confirm("Kick this player from the game?")) {
                    socket.emit("kickPlayer", { lobbyId, playerId: pid });
                }
            });
        });
    }
}

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
socket.on("roundStart", (data) => {
    console.log("[game] roundStart received:", data.round);
    handleRoundStart(data);
});

function handleRoundStart({ round, sentence, blanksNeeded: bn, hand, timeLeft }) {
    gameStateReceived = true;
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
}

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
    selectedCards.splice(blankIdx, 1);
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
    if (selectedCards.length >= blanksNeeded) {
        // At max, pop the first selected card back into hand
        const removed = selectedCards.shift();
        currentHand.push(removed);
    }
    selectedCards.push(cardText);
    // Remove from hand
    const handIdx = currentHand.indexOf(cardText);
    if (handIdx !== -1) currentHand.splice(handIdx, 1);

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
    handEl.querySelectorAll(".card").forEach(c => c.classList.add("disabled"));
});

// ─── VOTE PHASE ───
socket.on("votePhase", (data) => {
    console.log("[game] votePhase received");
    handleVotePhase(data);
});

function handleVotePhase({ submissions, myId: serverMyId, timeLeft }) {
    gameStateReceived = true;
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
}

socket.on("voteAck", () => {
    phaseLabelEl.textContent = "Vote placed! Waiting for others...";
});

// ─── ROUND RESULTS ───
socket.on("roundResults", ({ round, roundWinner, results }) => {
    gameStateReceived = true;
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

socket.on("gameStarted", () => {
    // Already on game page, just wait for roundStart
});

socket.on("errorMsg", (data) => {
    const toast = document.createElement("div");
    toast.className = "error-toast";
    toast.textContent = data.msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});

// ─── LEAVE GAME ───
function showLeaveModal() {
    document.getElementById("leaveModal").style.display = "flex";
}
function cancelLeave() {
    document.getElementById("leaveModal").style.display = "none";
}
function confirmLeave() {
    socket.emit("leaveGame", { lobbyId });
    localStorage.removeItem("playerId");
    window.location.href = "/";
}

// ─── KICKED BY HOST ───
socket.on("kicked", () => {
    localStorage.removeItem("playerId");
    alert("You have been kicked from the game by the host.");
    window.location.href = "/";
});

