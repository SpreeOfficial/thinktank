function createLobby() {
  const nickname = document.getElementById("nickname").value;
  const lobbyId = Math.random().toString(36).slice(2, 6).toUpperCase();

  socket.emit("createLobby", { nickname }, ({ lobbyId }) => {
    localStorage.setItem("lobbyId", lobbyId);
    localStorage.setItem("nickname", nickname);
    window.location.href = "/lobby.html";
  });
}

function joinLobby() {
  const nickname = document.getElementById("nickname").value;
  const lobbyId = document.getElementById("joinLobbyId").value;

  socket.emit("joinLobby", { lobbyId, nickname }, (res) => {
    if (res.error) return alert(res.error);

    localStorage.setItem("lobbyId", lobbyId);
    localStorage.setItem("nickname", nickname);
    window.location.href = "/lobby.html";
  });
}
