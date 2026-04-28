function createLobby() {
    const nickname = document.getElementById("nickname").value.trim();
    if (!nickname) return alert("Enter a nickname!");
    socket.emit("createLobby", { nickname }, (res) => {
        if (res.error) return alert(res.error);
        localStorage.setItem("nickname", nickname);
        localStorage.setItem("playerId", res.playerId);
        window.location.href = "/lobby.html?lobbyId=" + res.lobbyId;
    });
}
function joinLobby() {
    const nickname = document.getElementById("nickname").value.trim();
    const lobbyId = document.getElementById("joinLobbyId").value.trim().toUpperCase();
    if (!nickname) return alert("Enter a nickname!");
    if (!lobbyId) return alert("Enter a lobby ID!");
    socket.emit("joinLobby", { lobbyId, nickname }, (res) => {
        if (res.error) return alert(res.error);
        localStorage.setItem("nickname", nickname);
        localStorage.setItem("playerId", res.playerId);
        window.location.href = "/lobby.html?lobbyId=" + lobbyId;
    });
}
// restore nickname
const saved = localStorage.getItem("nickname");
if (saved) document.getElementById("nickname").value = saved;
