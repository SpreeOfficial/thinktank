const socket = io();
window.socket = socket;

// join lobby
function joinLobby(name) {
  socket.emit("joinLobby", name);
}

// start game
function startGame() {
  socket.emit("startGame");
}

// send answer
function submitAnswer(answer) {
  socket.emit("submitAnswer", answer);
}

// LISTENERS
socket.on("lobbyUpdate", (players) => {
  console.log("Players:", players);
  updateLobbyUI(players);
});

socket.on("gameStarted", (state) => {
  console.log("Game started", state);
  showGameScreen();
});

socket.on("newRound", (question) => {
  console.log("New round:", question);
  showQuestion(question);
});
