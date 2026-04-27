const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const lobbies = {};
// lobbyId -> { hostId: playerId, players: { playerId: { nickname, socketId } } }

function generateLobbyId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("Connected socket:", socket.id);

  // ✅ SERVER generates playerId
  const playerId = crypto.randomUUID();
  socket.data.playerId = playerId;

  // send to client
  socket.emit("init", { playerId });

  // CREATE LOBBY
  socket.on("createLobby", ({ nickname }, callback) => {
    const lobbyId = generateLobbyId();

    lobbies[lobbyId] = {
      hostId: playerId,
      players: {
        [playerId]: {
          nickname,
          socketId: socket.id
        }
      }
    };

    socket.join(lobbyId);

    callback({
      lobbyId,
      playerId
    });

    io.to(lobbyId).emit("lobbyUpdate", lobbies[lobbyId]);
  });

  // JOIN LOBBY
  socket.on("joinLobby", ({ lobbyId, nickname, playerId }, callback) => {
    const lobby = lobbies[lobbyId];

    if (!lobby) {
      return callback({ error: "Lobby not found" });
    }

    lobby.players[playerId] = {
      nickname,
      socketId: socket.id
    };

    socket.join(lobbyId);

    callback({
      lobbyId,
      playerId
    });

    io.to(lobbyId).emit("lobbyUpdate", lobby);
  });

  // START GAME
  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    if (lobby.hostId !== socket.data.playerId) return;

    io.to(lobbyId).emit("gameStarted", { lobbyId });
  });

});

server.listen(3000, () => console.log("Server running on 3000"));
