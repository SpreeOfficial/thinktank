let lobbyId = new URLSearchParams(window.location.search).get("lobby");
window.lobbyId = lobbyId;

let currentPlayers = [];

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

// PLAYERS UPDATE (ONLY ONCE)
socket.on("updatePlayers", (players) => {
  currentPlayers = players;

  const list = document.getElementById("players");
  if (!list) return;

  list.innerHTML = players
    .map(p => `<li>${p.name}</li>`)
    .join("");
});

// GAME START
socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});
