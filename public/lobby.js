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

socket.on("joinLobby", ({ lobbyId, nickname, playerId }, callback) => {
  const lobby = lobbies[lobbyId];

  if (!lobby) return callback({ error: "Lobby not found" });

  lobby.players[playerId] = {
    nickname,
    socketId: socket.id
  };

  socket.join(lobbyId);

  callback({ lobbyId });
  io.to(lobbyId).emit("lobbyUpdate", lobby);
});

function startGame() {
  window.location = `/game.html?lobby=${lobbyId}`;
}

console.log("Lobby ID:", lobbyId);
