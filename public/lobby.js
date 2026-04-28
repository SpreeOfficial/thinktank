const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId");
const playersList = document.getElementById("players");
const lobbyIdText = document.getElementById("lobbyId");
const startBtn = document.getElementById("startBtn");
const waitMsg = document.getElementById("waitMsg");
let playerId = null;
let nickname = localStorage.getItem("nickname");
let hasJoined = false;
if (lobbyIdText) lobbyIdText.innerText = lobbyId || "-----";
if (!lobbyId) {
    alert("Missing lobbyId in URL");
    window.location.href = "/";
}
socket.on("init", (data) => {
    playerId = data.playerId;
    if (!hasJoined) {
        hasJoined = true;
        socket.emit("joinLobby", { lobbyId, nickname, playerId }, (res) => {
            if (res && res.error) {
                alert(res.error);
                window.location.href = "/";
            }
            if (res && res.playerId) {
                playerId = res.playerId;
                localStorage.setItem("playerId", playerId);
            }
        });
    }
});
socket.on("lobbyUpdate", (lobby) => {
    if (!playersList) return;
    playersList.innerHTML = "";
    Object.entries(lobby.players).forEach(([pid, player]) => {
        const li = document.createElement("li");
        li.textContent = player.nickname;
        if (pid === lobby.hostId) {
            const badge = document.createElement("span");
            badge.className = "host-badge";
            badge.textContent = "HOST";
            li.appendChild(badge);
        }
        if (pid === playerId) {
            li.style.borderLeft = "3px solid #e94560";
        }
        playersList.appendChild(li);
    });
    // show start button only for host
    if (playerId === lobby.hostId) {
        startBtn.style.display = "inline-block";
        waitMsg.style.display = "none";
    } else {
        startBtn.style.display = "none";
        waitMsg.style.display = "block";
    }
});
function startGame() {
    socket.emit("startGame", { lobbyId });
}
socket.on("gameStarted", (data) => {
    window.location.href = "/game.html?lobbyId=" + (data.lobbyId || lobbyId);
});
socket.on("errorMsg", (data) => {
    alert(data.msg);
});
