const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let lobbies = {};

// TEST DATA
const prompts = [
  "I never leave the house without ___.",
  "My secret talent is ___.",
  "The best thing to bring to a party is ___."
];

const answerCards = [
  "a rubber chicken",
  "my ex",
  "a mysterious box",
  "too much confidence",
  "a broken dream",
  "a potato",
  "an awkward silence",
  "a dancing cat",
  "a bad idea",
  "nothing at all"
];

io.on("connection", (socket) => {

  socket.on("createLobby", () => {
    const id = uuidv4().slice(0, 5);

    lobbies[id] = {
      players: [],
      submissions: [],
      votes: {},
      scores: {},
      prompt: null
    };

    socket.emit("lobbyCreated", id);
  });

  socket.on("joinLobby", ({ lobbyId, name }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    const player = {
      id: socket.id,
      name,
      hand: []
    };

    lobby.players.push(player);
    lobby.scores[socket.id] = 0;

    socket.join(lobbyId);

    io.to(lobbyId).emit("updatePlayers", lobby.players);
  });

  socket.on("startGame", (lobbyId) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    startRound(lobbyId);
  });

  socket.on("submitAnswer", ({ lobbyId, answer }) => {
    const lobby = lobbies[lobbyId];

    lobby.submissions.push({
      playerId: socket.id,
      answer
    });

    if (lobby.submissions.length === lobby.players.length) {
      io.to(lobbyId).emit("startVoting", lobby.submissions);
    }
  });

  socket.on("vote", ({ lobbyId, playerId }) => {
    const lobby = lobbies[lobbyId];

    if (!lobby.votes[playerId]) {
      lobby.votes[playerId] = 0;
    }

    lobby.votes[playerId]++;

    const totalVotes = Object.values(lobby.votes).reduce((a,b)=>a+b,0);

    if (totalVotes === lobby.players.length) {
      let winner = Object.keys(lobby.votes).reduce((a, b) =>
        lobby.votes[a] > lobby.votes[b] ? a : b
      );

      lobby.scores[winner]++;

      io.to(lobbyId).emit("roundWinner", {
        winner,
        scores: lobby.scores
      });

      setTimeout(() => startRound(lobbyId), 5000);
    }
  });

});

function startRound(lobbyId) {
  const lobby = lobbies[lobbyId];

  lobby.submissions = [];
  lobby.votes = {};
  lobby.prompt = prompts[Math.floor(Math.random() * prompts.length)];

  lobby.players.forEach(player => {
    player.hand = shuffle(answerCards).slice(0, 7);
  });

  io.to(lobbyId).emit("newRound", {
    prompt: lobby.prompt,
    players: lobby.players
  });
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
