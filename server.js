const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));
const lobbies = {};
// ─── SENTENCE CARDS (blanks shown as ___) ───
const SENTENCES = [
    "I never thought I'd find ___ in my grandma's attic.",
    "The secret ingredient in my famous soup is ___.",
    "My therapist quit after I told her about ___.",
    "The airline lost my luggage but found ___.",
    "During the meeting, my boss accidentally revealed ___.",
    "The last thing you want to find in your bed is ___.",
    "My dating profile says I'm into ___.",
    "Scientists have discovered that ___ cures hiccups.",
    "At the family reunion, Uncle Dave wouldn't stop talking about ___.",
    "I got fired for bringing ___ to the office potluck.",
    "The real reason the dinosaurs went extinct was ___.",
    "My New Year's resolution is to stop ___.",
    "The worst superpower would be the ability to ___.",
    "According to my horoscope, today I will encounter ___.",
    "The museum's newest exhibit is dedicated entirely to ___.",
    "I told my doctor I was feeling ___ and he just laughed.",
    "My Uber driver wouldn't stop talking about ___.",
    "The school banned ___ after last year's incident.",
    "What I found in the office fridge was definitely ___.",
    "My autobiography will be titled '___: A Love Story'.",
    // Two-blank sentences
    "I traded ___ for ___ and honestly it was worth it.",
    "When life gives you ___, make ___.",
    "My mom caught me ___ and my only excuse was ___.",
    "Step 1: ___. Step 2: ___. Step 3: Profit.",
    "In a world full of ___, be ___.",
    "___ is just ___ with extra steps.",
    "I asked for ___ for Christmas but got ___ instead.",
    "The difference between ___ and ___ is surprisingly small.",
    "My tinder date brought ___ and I brought ___. It was awkward.",
    "The best combo is ___ and ___ on a Friday night.",
];
// ─── ANSWER CARDS ───
const ANSWER_CARDS = [
    "A suspicious amount of cheese",
    "Aggressive cuddling",
    "An emotional support alligator",
    "Passive-aggressive post-it notes",
    "A haunted IKEA shelf",
    "Weaponized glitter",
    "Grandpa's secret OnlyFans",
    "Unsolicited career advice",
    "A sentient Roomba with trust issues",
    "Competitive yodeling",
    "Tax fraud disguised as a hobby",
    "An inappropriately timed kazoo solo",
    "Three raccoons in a trench coat",
    "Interpretive dance at a funeral",
    "A strongly worded letter to God",
    "Expired yogurt and false hope",
    "Accidentally joining a cult",
    "Existential dread in a party hat",
    "A PowerPoint about my feelings",
    "The forbidden drawer",
    "My browser history",
    "An unexpected mariachi band",
    "Extreme couponing gone wrong",
    "A jar of toenails labeled 'memories'",
    "Sobbing in a Costco parking lot",
    "Faking my own death to avoid a meeting",
    "An uncomfortably warm handshake",
    "Full-volume diarrhea",
    "A LinkedIn message from Satan",
    "The overwhelming smell of burnt ambition",
    "Two possums and a dream",
    "Microwaving fish in the office",
    "A fake mustache and zero dignity",
    "Screaming into the void (but politely)",
    "A suspicious puddle",
    "Drunk-texting my ex's mom",
    "A life-sized cardboard cutout of Nicolas Cage",
    "Anxiety with a side of nachos",
    "A motivational tattoo in Comic Sans",
    "Oversharing at a dinner party",
    "My landlord's weird puppet collection",
    "17 tabs open and none of them useful",
    "A conspiracy theory about pigeons",
    "Unresolved childhood trauma",
    "A clog from a Dutch museum",
    "An accidental declaration of war",
    "Silent but deadly yoga class",
    "Spontaneous nudity",
    "A viking funeral for a houseplant",
    "Crying at IKEA",
    "A trebuchet full of pudding",
    "Whispering sweet nothings to a sandwich",
    "An extremely judgmental cat",
    "Toddler with a knife",
    "A very public meltdown",
    "Smelling like regret",
    "Aggressive eye contact",
    "A 3 AM Wikipedia rabbit hole",
    "Socks with sandals (and confidence)",
    "Befriending a parking meter",
    "An uncomfortably long hug",
    "A midlife crisis speedrun",
    "Running with scissors (emotionally)",
    "The ghost of bad decisions past",
    "An elaborate cheese heist",
    "A poorly timed standing ovation",
    "My collection of participation trophies",
    "Being chased by a goose (again)",
    "A strongly worded Yelp review",
    "Wearing Crocs to a job interview",
];
const HAND_SIZE = 7;
const ROUND_TIME = 120;
const VOTE_TIME = 60;
function generateLobbyId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function countBlanks(sentence) {
    return (sentence.match(/___/g) || []).length;
}
function dealCards(existingHand, deckRef) {
    const hand = existingHand ? [...existingHand] : [];
    while (hand.length < HAND_SIZE) {
        if (deckRef.cards.length === 0) {
            deckRef.cards = shuffleArray(ANSWER_CARDS);
        }
        hand.push(deckRef.cards.pop());
    }
    return hand;
}
function startRound(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game) return;
    const game = lobby.game;
    game.phase = "playing";
    game.round++;
    game.submissions = {};
    game.votes = {};
    if (game.sentenceDeck.length === 0) {
        game.sentenceDeck = shuffleArray(SENTENCES);
    }
    game.currentSentence = game.sentenceDeck.pop();
    game.blanksNeeded = countBlanks(game.currentSentence);
    for (const pid of Object.keys(lobby.players)) {
        game.hands[pid] = dealCards(game.hands[pid], game.answerDeck);
    }
    for (const pid of Object.keys(lobby.players)) {
        const sid = lobby.players[pid].socketId;
        if (sid) {
            io.to(sid).emit("roundStart", {
                round: game.round,
                sentence: game.currentSentence,
                blanksNeeded: game.blanksNeeded,
                hand: game.hands[pid],
                timeLeft: ROUND_TIME,
            });
        }
    }
    game.timerEnd = Date.now() + ROUND_TIME * 1000;
    clearTimeout(game.timer);
    game.timer = setTimeout(() => endPlayPhase(lobbyId), ROUND_TIME * 1000);
    clearInterval(game.tickInterval);
    game.tickInterval = setInterval(() => {
        const left = Math.max(0, Math.ceil((game.timerEnd - Date.now()) / 1000));
        io.to(lobbyId).emit("tick", { timeLeft: left });
        if (left <= 0) clearInterval(game.tickInterval);
    }, 1000);
}
function endPlayPhase(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game) return;
    const game = lobby.game;
    clearTimeout(game.timer);
    clearInterval(game.tickInterval);
    game.phase = "voting";
    game.votes = {};
    const submissionsList = Object.entries(game.submissions).map(([pid, cards]) => {
        let filled = game.currentSentence;
        cards.forEach(c => {
            filled = filled.replace("___", "<strong>" + c + "</strong>");
        });
        return { oderId: pid, filledSentence: filled };
    });
    const shuffled = shuffleArray(submissionsList);
    for (const pid of Object.keys(lobby.players)) {
        const sid = lobby.players[pid].socketId;
        if (sid) {
            io.to(sid).emit("votePhase", {
                submissions: shuffled,
                myId: pid,
                timeLeft: VOTE_TIME,
            });
        }
    }
    game.timerEnd = Date.now() + VOTE_TIME * 1000;
    clearTimeout(game.timer);
    game.timer = setTimeout(() => endVotePhase(lobbyId), VOTE_TIME * 1000);
    clearInterval(game.tickInterval);
    game.tickInterval = setInterval(() => {
        const left = Math.max(0, Math.ceil((game.timerEnd - Date.now()) / 1000));
        io.to(lobbyId).emit("tick", { timeLeft: left });
        if (left <= 0) clearInterval(game.tickInterval);
    }, 1000);
}
function checkAllSubmitted(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game) return;
    const game = lobby.game;
    const playerIds = Object.keys(lobby.players);
    const submitted = Object.keys(game.submissions);
    if (submitted.length >= playerIds.length) {
        endPlayPhase(lobbyId);
    }
}
function checkAllVoted(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game) return;
    const game = lobby.game;
    const playerIds = Object.keys(lobby.players);
    const voted = Object.keys(game.votes);
    if (voted.length >= playerIds.length) {
        endVotePhase(lobbyId);
    }
}
function endVotePhase(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game) return;
    const game = lobby.game;
    clearTimeout(game.timer);
    clearInterval(game.tickInterval);
    const roundScores = {};
    for (const pid of Object.keys(lobby.players)) {
        roundScores[pid] = 0;
    }
    for (const [voterId, votedForId] of Object.entries(game.votes)) {
        if (roundScores[votedForId] !== undefined) {
            roundScores[votedForId]++;
        }
    }
    for (const [pid, pts] of Object.entries(roundScores)) {
        game.scores[pid] = (game.scores[pid] || 0) + pts;
    }
    let roundWinner = null;
    let maxPts = 0;
    for (const [pid, pts] of Object.entries(roundScores)) {
        if (pts > maxPts) {
            maxPts = pts;
            roundWinner = pid;
        }
    }
    const results = Object.keys(lobby.players).map(pid => {
        let filled = game.currentSentence;
        (game.submissions[pid] || []).forEach(c => {
            filled = filled.replace("___", "<strong>" + c + "</strong>");
        });
        return {
            playerId: pid,
            nickname: lobby.players[pid].nickname,
            filledSentence: filled,
            roundPoints: roundScores[pid] || 0,
            totalScore: game.scores[pid] || 0,
        };
    });
    io.to(lobbyId).emit("roundResults", {
        round: game.round,
        roundWinner: roundWinner ? lobby.players[roundWinner]?.nickname : null,
        results,
    });
    game.phase = "results";
    game.timer = setTimeout(() => {
        startRound(lobbyId);
    }, 10000);
}
io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    // CREATE LOBBY
    socket.on("createLobby", ({ nickname }, callback) => {
        const playerId = crypto.randomUUID();
        const lobbyId = generateLobbyId();
        lobbies[lobbyId] = {
            hostId: playerId,
            players: {
                [playerId]: { nickname, socketId: socket.id }
            },
            game: null,
        };
        socket.join(lobbyId);
        socket.data.lobbyId = lobbyId;
        socket.data.playerId = playerId;
        callback({ lobbyId, playerId });
        io.to(lobbyId).emit("lobbyUpdate", {
            hostId: lobbies[lobbyId].hostId,
            players: lobbies[lobbyId].players,
        });
    });

    // JOIN LOBBY
    socket.on("joinLobby", ({ lobbyId, nickname, playerId: reqPlayerId }, callback) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return callback({ error: "Lobby not found" });

        const pid = reqPlayerId && lobby.players[reqPlayerId] ? reqPlayerId : null;

        if (pid) {
            // Reconnecting existing player — update socket
            lobby.players[pid].socketId = socket.id;
            if (nickname) lobby.players[pid].nickname = nickname;
            // Clear any pending disconnect timer
            if (lobby.players[pid]._disconnectTimer) {
                clearTimeout(lobby.players[pid]._disconnectTimer);
                delete lobby.players[pid]._disconnectTimer;
            }
            socket.join(lobbyId);
            socket.data.lobbyId = lobbyId;
            socket.data.playerId = pid;
            callback({ lobbyId, playerId: pid });
        } else {
            // New player joining
            if (lobby.game && lobby.game.phase !== null) {
                return callback({ error: "Game already in progress" });
            }
            const newPid = crypto.randomUUID();
            lobby.players[newPid] = {
                nickname,
                socketId: socket.id,
            };
            socket.join(lobbyId);
            socket.data.lobbyId = lobbyId;
            socket.data.playerId = newPid;
            callback({ lobbyId, playerId: newPid });
        }

        io.to(lobbyId).emit("lobbyUpdate", {
            hostId: lobby.hostId,
            players: lobby.players,
        });
    });

    // START GAME
    socket.on("startGame", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        if (lobby.hostId !== socket.data.playerId) return;
        if (Object.keys(lobby.players).length < 2) {
            socket.emit("errorMsg", { msg: "Need at least 2 players to start!" });
            return;
        }
        lobby.game = {
            round: 0,
            phase: null,
            currentSentence: null,
            blanksNeeded: 0,
            submissions: {},
            votes: {},
            hands: {},
            scores: {},
            sentenceDeck: shuffleArray(SENTENCES),
            answerDeck: { cards: shuffleArray(ANSWER_CARDS) },
            timer: null,
            tickInterval: null,
            timerEnd: null,
        };
        for (const pid of Object.keys(lobby.players)) {
            lobby.game.scores[pid] = 0;
        }
        io.to(lobbyId).emit("gameStarted", { lobbyId });
        setTimeout(() => startRound(lobbyId), 1500);
    });

    // SUBMIT CARDS
    socket.on("submitCards", ({ lobbyId, cards }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby || !lobby.game) return;
        const game = lobby.game;
        if (game.phase !== "playing") return;
        const pid = socket.data.playerId;
        if (game.submissions[pid]) return;
        if (cards.length !== game.blanksNeeded) return;
        game.submissions[pid] = cards;
        const hand = game.hands[pid] || [];
        cards.forEach(c => {
            const idx = hand.indexOf(c);
            if (idx !== -1) hand.splice(idx, 1);
        });
        game.hands[pid] = hand;
        socket.emit("submitAck", { ok: true });
        checkAllSubmitted(lobbyId);
    });

    // VOTE
    socket.on("vote", ({ lobbyId, votedForId }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby || !lobby.game) return;
        const game = lobby.game;
        if (game.phase !== "voting") return;
        const pid = socket.data.playerId;
        if (game.votes[pid]) return;
        if (votedForId === pid) return;
        game.votes[pid] = votedForId;
        socket.emit("voteAck", { ok: true });
        checkAllVoted(lobbyId);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
        const lobbyId = socket.data.lobbyId;
        const pid = socket.data.playerId;
        if (!lobbyId || !pid) return;
        const lobby = lobbies[lobbyId];
        if (!lobby || !lobby.players[pid]) return;

        // If game is in progress, give a grace period for reconnect
        // If in lobby (no game), remove after a shorter timeout
        const timeout = lobby.game ? 60000 : 15000;
        lobby.players[pid]._disconnectTimer = setTimeout(() => {
            const l = lobbies[lobbyId];
            if (!l || !l.players[pid]) return;
            // Only remove if still disconnected (socketId hasn't changed)
            if (l.players[pid].socketId === socket.id) {
                delete l.players[pid];
                io.to(lobbyId).emit("lobbyUpdate", {
                    hostId: l.hostId,
                    players: l.players,
                });
                // Clean up empty lobbies
                if (Object.keys(l.players).length === 0) {
                    if (l.game) {
                        clearTimeout(l.game.timer);
                        clearInterval(l.game.tickInterval);
                    }
                    delete lobbies[lobbyId];
                }
            }
        }, timeout);
    });
});
server.listen(3000, () => console.log("Server running on http://localhost:3000"));
