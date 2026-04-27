const lobbyId = localStorage.getItem("lobbyId");
const nickname = localStorage.getItem("nickname");

let hasJoined = localStorage.getItem("hasJoined");

if (!hasJoined) {
  socket.emit("joinLobby", { lobbyId, nickname }, (res) => {
    if (res.error) return alert(res.error);
    localStorage.setItem("hasJoined", "true");
  });
}

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
  document.getElementById("startBtn").style.display = isHost ? "block" : "none";
});

function startGame() {
  socket.emit("startGame", { lobbyId });
}

socket.on("gameStarted", () => {
  window.location.href = "/game.html";
});
