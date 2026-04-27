let currentPlayers = [];

const lobbyId = new URLSearchParams(window.location.search).get("lobby");
window.lobbyId = lobbyId;

// JOIN
function join() {
  const name = document.getElementById("name").value;
  if (!name) return;

  socket.emit("joinLobby", { lobbyId, name });
}

// START GAME
function start() {
  socket.emit("startGame", lobbyId);
}

// UPDATE PLAYERS (IMPORTANT: ONLY IN LOBBY)
socket.on("updatePlayers", (players) => {
  currentPlayers = players;

  const list = document.getElementById("players");
  if (!list) return;

  list.innerHTML = players
    .map(p => `<li>${p.name}</li>`)
    .join("");
});

// REDIRECT TO GAME
socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});
