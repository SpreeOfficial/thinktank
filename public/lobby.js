const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId");
const nickname = localStorage.getItem("nickname");

// ALWAYS join when page loads
socket.emit("joinLobby", { lobbyId, nickname }, (res) => {
  if (res.error) return alert(res.error);
});

socket.on("lobbyUpdate", (lobby) => {
  document.getElementById("lobbyId").innerText = lobbyId;

  const list = document.getElementById("players");
  list.innerHTML = "";

  Object.values(lobby.players).forEach((p) => {
    const li = document.createElement("li");
    li.innerText = p.nickname;
    list.appendChild(li);
  });

  const isHost = socket.id === lobby.hostId;
  document.getElementById("startBtn").style.display =
    isHost ? "block" : "none";
});

function startGame() {
  socket.emit("startGame", { lobbyId });
}

// GAME START
socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});
