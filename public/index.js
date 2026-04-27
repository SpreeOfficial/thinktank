function createLobby() {
  const nickname = document.getElementById("nickname").value;

  socket.emit("createLobby", { nickname }, (res) => {
    if (res.error) {
      alert(res.error);
      return;
    }

    localStorage.setItem("lobbyId", res.lobbyId);
    localStorage.setItem("nickname", nickname);

    window.location.href = `/lobby.html?lobbyId=${res.lobbyId}`;
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
