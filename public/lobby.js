const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId");

const playersList = document.getElementById("players");
const lobbyIdText = document.getElementById("lobbyId");
const startBtn = document.getElementById("startBtn");

let playerId = null;
let nickname = localStorage.getItem("nickname");

// show lobby id
if (lobbyIdText) {
  lobbyIdText.innerText = lobbyId || "UNKNOWN";
}

if (!lobbyId) {
  alert("Missing lobbyId in URL");
  throw new Error("No lobbyId");
}

// ✅ receive server-generated playerId
socket.on("init", (data) => {
  playerId = data.playerId;
  console.log("My playerId:", playerId);
});

// join lobby AFTER we have playerId
socket.on("connect", () => {
  socket.emit("joinLobby", {
    lobbyId,
    nickname,
    playerId
  }, (res) => {
    if (res?.error) {
      alert(res.error);
    }
  });
});

// render lobby
socket.on("lobbyUpdate", (lobby) => {
  if (!playersList) return;

  playersList.innerHTML = "";

  Object.entries(lobby.players).forEach(([pid, player]) => {
    const li = document.createElement("li");
    const shortId = pid.slice(0, 6);
    
    li.textContent = `${player.nickname} (${shortId})`;
    
    playersList.appendChild(li);
  });
});

function startGame() {
  socket.emit("startGame", { lobbyId });
}

socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});

console.log("Lobby ID:", lobbyId);
