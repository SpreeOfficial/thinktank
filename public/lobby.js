let lobbyId = new URLSearchParams(window.location.search).get("lobby");
window.lobbyId = lobbyId;

// MAKE GLOBAL (vigtigt for onclick)
window.start = function () {
  socket.emit("startGame", lobbyId);
};

window.join = function () {
  const name = document.getElementById("name").value;
  if (!name) return;

  socket.emit("joinLobby", { lobbyId, name });
};

// PLAYERS UPDATE (ONLY ONCE)
socket.on("updatePlayers", (players) => {
  const list = document.getElementById("players");
  if (!list) return;

  list.innerHTML = players.map(p => `<li>${p.name}</li>`).join("");
});

// GAME START
socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});
