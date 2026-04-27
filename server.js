const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

let lobbies = {};

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
      voters: {},
      scores: {},
      timer: null,
      votingStarted: false
    };

    socket.emit("lobbyCreated", id);
  });

  socket.on("joinLobby", ({ lobbyId, name }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    lobby.players.push({
      id: socket.id,
      name,
      hand: []
    });

    lobby.scores[socket.id] = 0;

    socket.join(lobbyId);

    io.to(lobbyId).emit("updatePlayers", lobby.players);
  });

  socket.on("startGame", (lobbyId) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    io.to(lobbyId).emit("gameStarted");
    startRound(lobbyId);
  });

  socket.on("submitAnswer", ({ lobbyId, answer }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    if (lobby.submissions.find(s => s.playerId === socket.id)) return;

    lobby.submissions.push({ playerId: socket.id, answer });

    if (lobby.submissions.length === lobby.players.length) {
      startVoting(lobbyId);
    }
  });

  socket.on("vote", ({ lobbyId, playerId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    if (playerId === socket.id) return;

    if (lobby.voters[socket.id]) return;
    lobby.voters[socket.id] = true;

    lobby.votes[playerId] = (lobby.votes[playerId] || 0) + 1;

    if (Object.keys(lobby.voters).length === lobby.players.length) {
      finishVoting(lobbyId);
    }
  });

  socket.on("disconnect", () => {
    for (const id in lobbies) {
      const lobby = lobbies[id];

      lobby.players = lobby.players.filter(p => p.id !== socket.id);
      delete lobby.scores[socket.id];

      io.to(id).emit("updatePlayers", lobby.players);

      if (lobby.players.length === 0) {
        delete lobbies[id];
      }
    }
  });

});

function startRound(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  lobby.submissions = [];
  lobby.votes = {};
  lobby.voters = {};
  lobby.votingStarted = false;

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  lobby.prompt = prompt;

  lobby.players.forEach(p => {
    p.hand = shuffle([...answerCards]).slice(0, 7);
  });

  io.to(lobbyId).emit("newRound", {
    prompt,
    players: lobby.players
  });

  let time = 120;

  lobby.timer = setInterval(() => {
    time--;

    io.to(lobbyId).emit("timerUpdate", time);

    if (time <= 0) {
      clearInterval(lobby.timer);
      startVoting(lobbyId);
    }
  }, 1000);
}

function startVoting(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby || lobby.votingStarted) return;

  lobby.votingStarted = true;
  clearInterval(lobby.timer);

  io.to(lobbyId).emit("startVoting", lobby.submissions);
}

function finishVoting(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  const winner = Object.keys(lobby.votes).reduce((a, b) =>
    lobby.votes[a] > lobby.votes[b] ? a : b
  );

  lobby.scores[winner]++;

  io.to(lobbyId).emit("roundWinner", {
    winner,
    scores: lobby.scores,
    players: lobby.players
  });

  setTimeout(() => startRound(lobbyId), 4000);
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

server.listen(PORT, () => {
  console.log("Server running on", PORT);
});
