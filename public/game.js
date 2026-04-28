const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId") || params.get("lobby");
let myId = null;
let currentSentence = "";
let blanksNeeded = 0;
let selectedCards = [];
let hasSubmitted = false;
let hasVoted = false;
const timerEl = document.getElementById("timer");
const phaseLabelEl = document.getElementById("phaseLabel");
const roundLabelEl = document.getElementById("roundLabel");
const sentenceEl = document.getElementById("sentence");
const selectedPreviewEl = document.getElementById("selectedPreview");
const handEl = document.getElementById("hand");
const submitAreaEl = document.getElementById("submitArea");
const submitBtn = document.getElementById("submitBtn");
const votingEl = document.getElementById("voting");
const resultsEl = document.getElementById("results");
const scoreboardEl = document.getElementById("scoreboard");
// Rejoin lobby so server knows our new socket
myId = localStorage.getItem("playerId");
const nickname = localStorage.getItem("nickname") || "Player";
socket.emit("joinLobby", { lobbyId, nickname, playerId: myId }, (res) => {
    if (res && res.playerId) {
        myId = res.playerId;
        localStorage.setItem("playerId", myId);
    }
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
    hasSubmitted = false;
    hasVoted = false;
    phaseLabelEl.textContent = "Pick " + blanksNeeded + " card" + (blanksNeeded > 1 ? "s" : "");
    roundLabelEl.innerHTML = '<span class="round-label">Round ' + round + '</span>';
    // show sentence with blanks
    sentenceEl.style.display = "block";
    renderSentence();
    // show hand
    renderHand(hand);
    submitAreaEl.style.display = "block";
    submitBtn.disabled = true;
    // hide other sections
    votingEl.style.display = "none";
    resultsEl.style.display = "none";
    timerEl.textContent = timeLeft + "s";
    timerEl.classList.remove("warning");
});
function renderSentence() {
    let html = currentSentence;
    let i = 0;
    html = html.replace(/___/g, () => {
        const card = selectedCards[i];
        i++;
        if (card) {
            return '<span class="blank">' + escapeHtml(card) + '</span>';
        }
        return '<span class="blank">&nbsp;</span>';
    });
    sentenceEl.innerHTML = html;
}
function renderHand(hand) {
    handEl.innerHTML = "";
    hand.forEach(cardText => {
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
            toggleCard(cardText, hand);
        };
        handEl.appendChild(div);
    });
    updatePreview();
}
function toggleCard(cardText, hand) {
    const idx = selectedCards.indexOf(cardText);
    if (idx !== -1) {
        selectedCards.splice(idx, 1);
    } else {
        if (selectedCards.length >= blanksNeeded) {
            // replace the first one
            selectedCards.shift();
        }
        selectedCards.push(cardText);
    }
    renderHand(hand);
    renderSentence();
    submitBtn.disabled = selectedCards.length !== blanksNeeded;
}
function updatePreview() {
    if (selectedCards.length === 0) {
        selectedPreviewEl.innerHTML = "<em>Select cards to fill the blanks...</em>";
    } else {
        selectedPreviewEl.innerHTML = selectedCards.map(c => "<span>" + escapeHtml(c) + "</span>").join(" ");
    }
}
function submitCards() {
    if (hasSubmitted || selectedCards.length !== blanksNeeded) return;
    socket.emit("submitCards", { lobbyId, cards: [...selectedCards] });
}
socket.on("submitAck", () => {
    hasSubmitted = true;
    phaseLabelEl.textContent = "Waiting for other players...";
    submitAreaEl.style.display = "none";
    handEl.innerHTML = '<p class="waiting-msg">✅ Answer submitted! Waiting for others...</p>';
    selectedPreviewEl.innerHTML = "";
});
// ─── VOTE PHASE ───
socket.on("votePhase", ({ submissions, myId: serverMyId, timeLeft }) => {
    myId = serverMyId || myId;
    hasVoted = false;
    phaseLabelEl.textContent = "Vote for your favorite!";
    sentenceEl.style.display = "none";
    handEl.innerHTML = "";
    submitAreaEl.style.display = "none";
    selectedPreviewEl.innerHTML = "";
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
        const isMine = sub.oderId === myId;
        if (isMine) {
            div.classList.add("mine");
            div.title = "This is your answer";
        }
        div.onclick = () => {
            if (hasVoted || isMine) return;
            hasVoted = true;
            // highlight voted
            document.querySelectorAll(".vote-option").forEach(el => el.classList.remove("voted"));
            div.classList.add("voted");
            socket.emit("vote", { lobbyId, votedForId: sub.oderId });
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
    votingEl.style.display = "none";
    handEl.innerHTML = "";
    sentenceEl.style.display = "none";
    submitAreaEl.style.display = "none";
    selectedPreviewEl.innerHTML = "";
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
    // sort by round points desc
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
    // total scoreboard
    renderScoreboard(results);
    // countdown to next round
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
function renderScoreboard(results) {
    scoreboardEl.innerHTML = "<h3 style='color:#e94560; margin-bottom:8px;'>📊 Total Scores</h3>";
    const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);
    sorted.forEach((r, i) => {
        const row = document.createElement("div");
        row.className = "score-row";
        const medal = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : "";
        row.innerHTML =
            '<span>' + medal + escapeHtml(r.nickname) + '</span>' +
            '<span class="pts">' + r.totalScore + ' pts</span>';
        scoreboardEl.appendChild(row);
    });
}
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
// handle game started (redirect from lobby)
socket.on("gameStarted", () => {
    // already on game page, just wait for roundStart
});
socket.on("errorMsg", (data) => {
    const toast = document.createElement("div");
    toast.className = "error-toast";
    toast.textContent = data.msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});
