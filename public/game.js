let currentPlayers = [];
let hasSubmitted = false;

const lobbyId = new URLSearchParams(window.location.search).get("lobby");
window.lobbyId = lobbyId;

// NEW ROUND
socket.on("newRound", (data) => {
  currentPlayers = data.players;
  hasSubmitted = false;

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

// TIMER
socket.on("timerUpdate", (time) => {
  const el = document.getElementById("timer");
  if (el) el.innerText = "Time: " + time;
});

// SUBMIT ANSWER
function submit(card) {
  if (hasSubmitted) return;

  hasSubmitted = true;

  socket.emit("submitAnswer", { lobbyId, answer: card });

  document.getElementById("hand").innerHTML = "Submitted!";
}

// VOTING
socket.on("startVoting", (submissions) => {
  const voting = document.getElementById("voting");
  voting.innerHTML = "<h3>Vote</h3>";

  submissions.forEach(sub => {
    const player = currentPlayers.find(p => p.id === sub.playerId);

    const btn = document.createElement("button");
    btn.innerText = `${sub.answer} (${player?.name})`;

    btn.onclick = () => {
      if (sub.playerId === socket.id) return;

      socket.emit("vote", {
        lobbyId,
        playerId: sub.playerId
      });

      voting.innerHTML = "Vote sent";
    };

    voting.appendChild(btn);
  });
});

// SCOREBOARD
socket.on("roundWinner", (data) => {
  document.getElementById("scores").innerHTML =
    Object.entries(data.scores)
      .map(([id, score]) => {
        const p = data.players.find(x => x.id === id);
        return `<div>${p?.name}: ${score}</div>`;
      })
      .join("");
});
