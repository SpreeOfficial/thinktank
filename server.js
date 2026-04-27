const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const lobbies = {};
// lobbyId -> { hostId, players: { socketId: { nickname } } }

function generateLobbyId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // CREATE LOBBY
  socket.on("createLobby", ({ nickname }, callback) => {
    const lobbyId = generateLobbyId();

    lobbies[lobbyId] = {
      hostId: socket.id,
      players: {
        [socket.id]: { nickname }
      }
    };

    socket.join(lobbyId);

    callback({
      lobbyId,
      playerId: socket.id
    });

    io.to(lobbyId).emit("lobbyUpdate", lobbies[lobbyId]);
  });

  // JOIN LOBBY
  socket.on("joinLobby", ({ lobbyId, nickname }, callback) => {
    const lobby = lobbies[lobbyId];

    if (!lobby) {
      return callback({ error: "Lobby not found" });
    }

    lobby.players[socket.id] = { nickname };

    socket.join(lobbyId);

    callback({
      lobbyId,
      playerId: socket.id
    });

    io.to(lobbyId).emit("lobbyUpdate", lobby);
  });

  // START GAME
  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    if (socket.id !== lobby.hostId) return;

    io.to(lobbyId).emit("gameStarted", { lobbyId });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];

      if (!lobby.players[socket.id]) continue;

      delete lobby.players[socket.id];

      // delete empty lobby
      if (Object.keys(lobby.players).length === 0) {
        delete lobbies[lobbyId];
        continue;
      }

      // reassign host if needed
      if (lobby.hostId === socket.id) {
        lobby.hostId = Object.keys(lobby.players)[0];
      }

      io.to(lobbyId).emit("lobbyUpdate", lobby);
    }
  });
});

server.listen(3000, () => console.log("Server running on 3000"));
