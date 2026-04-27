const socket = io();
const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobby");

let currentPlayers = [];

function join() {
  const name = document.getElementById("name").value;

  socket.emit("joinLobby", { lobbyId, name });

  socket.on("updatePlayers", (players) => {
    currentPlayers = players;

    document.getElementById("players").innerHTML =
      players.map(p => `<li>${p.name}</li>`).join("");
  });
}

function start() {
  socket.emit("startGame", lobbyId);
}

socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});

socket.on("newRound", (data) => {
  currentPlayers = data.players;

  document.getElementById("prompt").innerText = data.prompt;

  const me = data.players.find(p => p.id === socket.id);

  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  me.hand.forEach(card => {
    const btn = document.createElement("button");
    btn.innerText = card;

    btn.onclick = () => submit(card);

    handDiv.appendChild(btn);
  });
});

socket.on("timerUpdate", (time) => {
  const timer = document.getElementById("timer");
  if (timer) {
    timer.innerText = "Time: " + time;
  }
});

function submit(card) {
  socket.emit("submitAnswer", { lobbyId, answer: card });
}

socket.on("startVoting", (submissions) => {
  const voting = document.getElementById("voting");

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

socket.on("roundWinner", (data) => {
  document.getElementById("scores").innerHTML =
    Object.entries(data.scores)
      .map(([id, score]) => {
        const player = data.players.find(p => p.id === id);
        return `<div>${player?.name || "Unknown"}: ${score}</div>`;
      })
      .join("");
});
