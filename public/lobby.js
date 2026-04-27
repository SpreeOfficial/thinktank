function handleJoin() {
  const name = document.getElementById("name").value;
  joinLobby(name);
}

function handleStart() {
  startGame();
}

function updateLobbyUI(players) {
  const list = document.getElementById("players");
  list.innerHTML = "";

  Object.values(players).forEach(p => {
    const el = document.createElement("div");
    el.innerText = `${p.name} - score: ${p.score}`;
    list.appendChild(el);
  });
}

// GAME START
socket.on("gameStarted", () => {
  window.location = `/game.html?lobby=${lobbyId}`;
});
