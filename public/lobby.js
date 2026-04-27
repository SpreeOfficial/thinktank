const socket = io();

const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId");
const nickname = localStorage.getItem("nickname");

const playersList = document.getElementById("players");
const lobbyIdText = document.getElementById("lobbyId");
const startBtn = document.getElementById("startBtn");

// SAFETY CHECK
if (!lobbyId) {
  alert("No lobby ID found in URL");
  throw new Error("Missing lobbyId");
}

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("joinLobby", { lobbyId, nickname }, (res) => {
    if (res?.error) {
      alert(res.error);
    }
  });
});

// UPDATE LOBBY UI
socket.on("lobbyUpdate", (lobby) => {
  lobbyIdText.innerText = lobbyId;

  playersList.innerHTML = "";

  Object.values(lobby.players).forEach((p) => {
    const li = document.createElement("li");
    li.innerText = p.nickname;
    playersList.appendChild(li);
  });

  const isHost = socket.id === lobby.hostId;
  startBtn.style.display = isHost ? "block" : "none";
});

// START GAME BUTTON
function startGame() {
  socket.emit("startGame", { lobbyId });
}

// GAME START EVENT
socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});
