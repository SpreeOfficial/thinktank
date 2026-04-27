const socket = io();
const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobby");

function join() {
  const name = document.getElementById("name").value;

  socket.emit("joinLobby", { lobbyId, name });

  socket.on("updatePlayers", (players) => {
    document.getElementById("players").innerHTML =
      players.map(p => `<li>${p.name}</li>`).join("");
  });

  window.location = `/game.html?lobby=${lobbyId}`;
}

function start() {
  socket.emit("startGame", lobbyId);
}

socket.on("newRound", (data) => {
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

function submit(card) {
  socket.emit("submitAnswer", { lobbyId, answer: card });
}

socket.on("startVoting", (submissions) => {
  const voting = document.getElementById("voting");
  voting.innerHTML = "<h3>Vote!</h3>";

  submissions.forEach(sub => {
    const btn = document.createElement("button");
    btn.innerText = sub.answer;

    btn.onclick = () => {
      socket.emit("vote", {
        lobbyId,
        playerId: sub.playerId
      });
    };

    voting.appendChild(btn);
  });
});

socket.on("roundWinner", (data) => {
  document.getElementById("scores").innerHTML =
    Object.entries(data.scores)
      .map(([id, score]) => `<div>${id}: ${score}</div>`)
      .join("");
});
