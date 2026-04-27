const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId");
const nickname = localStorage.getItem("nickname");

const playersList = document.getElementById("players");
const lobbyIdText = document.getElementById("lobbyId");
const startBtn = document.getElementById("startBtn");

// IMPORTANT: set immediately (NOT inside socket event)
if (lobbyIdText) {
  lobbyIdText.innerText = lobbyId || "UNKNOWN";
}

// safety check
if (!lobbyId) {
  alert("Missing lobbyId in URL");
  throw new Error("No lobbyId");
}

socket.on("connect", () => {
  socket.emit("joinLobby", { lobbyId, nickname, playerId }, (res) => {
    if (res?.error) {
      alert(res.error);
    }
  });
});

socket.on("lobbyUpdate", (lobby) => {
  if (!playersList) return;

  playersList.innerHTML = "";

  Object.values(lobby.players).forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.nickname;
    playersList.appendChild(li);
  });
});

function startGame() {
  window.location = `/game.html?lobby=${lobbyId}`;
}

console.log("Lobby ID:", lobbyId);
