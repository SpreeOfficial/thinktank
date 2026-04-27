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

  // CREATE LOBBY
  socket.on("createLobby", () => {
    const id = uuidv4().slice(0, 5);

    lobbies[id] = {
      players: [],
      submissions: [],
      votes: {},
      voters: {},
      scores: {},
      prompt: null,
      timer: null,
      votingStarted: false
    };

    socket.emit("lobbyCreated", id);
  });

  // JOIN LOBBY
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

  // START GAME
  socket.on("startGame", (lobbyId) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    io.to(lobbyId).emit("gameStarted");
    startRound(lobbyId);
  });

  // SUBMIT ANSWER
  socket.on("submitAnswer", ({ lobbyId, answer }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    // prevent double submit
    const alreadySubmitted = lobby.submissions.find(
      s => s.playerId === socket.id
    );
    if (alreadySubmitted) return;

    lobby.submissions.push({
      playerId: socket.id,
      answer
    });

    // if all submitted → start voting
    if (lobby.submissions.length === lobby.players.length) {
      startVoting(lobbyId);
    }
  });

  // VOTE
  socket.on("vote", ({ lobbyId, playerId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    // no self vote
    if (playerId === socket.id) return;

    // prevent double vote
    if (lobby.voters[socket.id]) return;
    lobby.voters[socket.id] = true;

    if (!lobby.votes[playerId]) {
      lobby.votes[playerId] = 0;
    }

    lobby.votes[playerId]++;

    const totalVotes = Object.keys(lobby.voters).length;

    if (totalVotes === lobby.players.length) {
      finishVoting(lobbyId);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];

      const before = lobby.players.length;

      lobby.players = lobby.players.filter(p => p.id !== socket.id);
      delete lobby.scores[socket.id];

      if (lobby.players.length !== before) {
        io.to(lobbyId).emit("updatePlayers", lobby.players);
      }

      // delete empty lobby
      if (lobby.players.length === 0) {
        delete lobbies[lobbyId];
      }
    }
  });

});

// START ROUND
function startRound(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  // reset state
  lobby.submissions = [];
  lobby.votes = {};
  lobby.voters = {};
  lobby.votingStarted = false;

  // new prompt
  lobby.prompt = prompts[Math.floor(Math.random() * prompts.length)];

  // give cards
  lobby.players.forEach(player => {
    player.hand = shuffle([...answerCards]).slice(0, 7);
  });

  io.to(lobbyId).emit("newRound", {
    prompt: lobby.prompt,
    players: lobby.players
  });

  startTimer(lobbyId, 120);
}

// TIMER
function startTimer(lobbyId, seconds) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  let timeLeft = seconds;

  lobby.timer = setInterval(() => {
    timeLeft--;

    io.to(lobbyId).emit("timerUpdate", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(lobby.timer);
      startVoting(lobbyId);
    }
  }, 1000);
}

// START VOTING
function startVoting(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby || lobby.votingStarted) return;

  lobby.votingStarted = true;

  clearInterval(lobby.timer);

  io.to(lobbyId).emit("startVoting", lobby.submissions);
}

// FINISH VOTING
function finishVoting(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  let winner = Object.keys(lobby.votes).reduce((a, b) =>
    lobby.votes[a] > lobby.votes[b] ? a : b
  );

  lobby.scores[winner]++;

  io.to(lobbyId).emit("roundWinner", {
    winner,
    scores: lobby.scores,
    players: lobby.players
  });

  setTimeout(() => startRound(lobbyId), 5000);
}

// SHUFFLE
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
