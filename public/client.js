const socket = io();
const params = new URLSearchParams(window.location.search);
const lobbyId = window.lobbyId;

let currentPlayers = [];
let hasSubmitted = false;

// JOIN LOBBY
function join() {
  const name = document.getElementById("name").value;
  if (!name) return;

  socket.emit("joinLobby", { lobbyId, name });
}

// LISTEN FOR PLAYER UPDATES (kun én gang!)
socket.on("updatePlayers", (players) => {
  currentPlayers = players;

  const list = document.getElementById("players");
  if (list) {
    list.innerHTML = players.map(p => `<li>${p.name}</li>`).join("");
  }
});

// START GAME
function start() {
  socket.emit("startGame", lobbyId);
}

// REDIRECT TO GAME
socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});

// NEW ROUND
socket.on("newRound", (data) => {
  currentPlayers = data.players;
  hasSubmitted = false;

  // clear voting UI
  const voting = document.getElementById("voting");
  if (voting) voting.innerHTML = "";

  document.getElementById("prompt").innerText = data.prompt;

  const me = data.players.find(p => p.id === socket.id);
  if (!me) return;

  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  me.hand.forEach(card => {
    const btn = document.createElement("button");
    btn.innerText = card;

    btn.onclick = () => submit(card);

    handDiv.appendChild(btn);
  });
});

// TIMER
socket.on("timerUpdate", (time) => {
  const timer = document.getElementById("timer");
  if (timer) {
    timer.innerText = "Time: " + time;
  }
});

// SUBMIT ANSWER
function submit(card) {
  if (hasSubmitted) return;

  hasSubmitted = true;

  socket.emit("submitAnswer", { lobbyId, answer: card });

  const handDiv = document.getElementById("hand");
  if (handDiv) {
    handDiv.innerHTML = "<p>Answer submitted!</p>";
  }
}

// START VOTING
socket.on("startVoting", (submissions) => {
  const voting = document.getElementById("voting");
  if (!voting) return;

  voting.innerHTML = "<h3>Vote!</h3>";

  submissions.forEach(sub => {
    const player = currentPlayers.find(p => p.id === sub.playerId);

    const btn = document.createElement("button");
    btn.innerText = `${sub.answer} (${player?.name || "Unknown"})`;

    btn.onclick = () => {
      // 🚫 no self vote
      if (sub.playerId === socket.id) return;

      socket.emit("vote", {
        lobbyId,
        playerId: sub.playerId
      });

      voting.innerHTML = "<p>Vote submitted!</p>";
    };

    voting.appendChild(btn);
  });
});

// ROUND WINNER
socket.on("roundWinner", (data) => {
  const scoresDiv = document.getElementById("scores");
  if (!scoresDiv) return;

  scoresDiv.innerHTML =
    Object.entries(data.scores)
      .map(([id, score]) => {
        const player = data.players.find(p => p.id === id);
        return `<div>${player?.name || "Unknown"}: ${score}</div>`;
      })
      .join("");
});
