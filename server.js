const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let gameState = {
  started: false,
  currentQuestion: null,
  round: 0
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN LOBBY
  socket.on("joinLobby", (name) => {
    players[socket.id] = {
      id: socket.id,
      name: name,
      score: 0
    };

    io.emit("lobbyUpdate", players);
  });

  // START GAME (host only in future)
  socket.on("startGame", () => {
    gameState.started = true;
    gameState.round = 1;

    io.emit("gameStarted", gameState);

    startRound();
  });

  // ANSWER FROM PLAYER
  socket.on("submitAnswer", (answer) => {
    console.log("Answer from", socket.id, answer);

    // demo scoring
    if (answer === gameState.currentQuestion?.correct) {
      players[socket.id].score += 1;
    }

    io.emit("lobbyUpdate", players);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("lobbyUpdate", players);
  });
});

function startRound() {
  gameState.currentQuestion = {
    text: "What is 2 + 2?",
    correct: "4"
  };

  io.emit("newRound", gameState.currentQuestion);
}

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
