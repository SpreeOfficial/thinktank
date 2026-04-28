const params = new URLSearchParams(window.location.search);
const lobbyId = params.get("lobbyId");
const playersList = document.getElementById("players");
const lobbyIdText = document.getElementById("lobbyId");
const startBtn = document.getElementById("startBtn");
const waitMsg = document.getElementById("waitMsg");
const nicknameOverlay = document.getElementById("nicknameOverlay");
const nicknameInput = document.getElementById("nicknameInput");

let playerId = localStorage.getItem("playerId");
let nickname = localStorage.getItem("nickname");
let hasJoined = false;

if (lobbyIdText) lobbyIdText.innerText = lobbyId || "-----";

if (!lobbyId) {
    alert("Missing lobbyId in URL");
    window.location.href = "/";
}

// If we have no nickname (direct URL visit), show overlay
if (!nickname) {
    if (nicknameOverlay) nicknameOverlay.style.display = "flex";
} else {
    joinLobbyNow();
}

function joinWithNickname() {
    const val = nicknameInput ? nicknameInput.value.trim() : "";
    if (!val) return alert("Enter a nickname!");
    nickname = val;
    localStorage.setItem("nickname", nickname);
    if (nicknameOverlay) nicknameOverlay.style.display = "none";
    joinLobbyNow();
}

function joinLobbyNow() {
    if (hasJoined) return;
    hasJoined = true;
    socket.emit("joinLobby", { lobbyId, nickname, playerId }, (res) => {
        if (res && res.error) {
            alert(res.error);
            window.location.href = "/";
            return;
        }
        if (res && res.playerId) {
            playerId = res.playerId;
            localStorage.setItem("playerId", playerId);
        }
    });
}

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
            li.style.borderLeft = "3px solid #d19e18";
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
