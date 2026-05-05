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
    // ─── Strong single-blank (fast + funny) ───
    "I never thought I'd find ___ in the office storage room.",
    "The secret ingredient in our company coffee is ___.",
    "The intern accidentally presented ___ to the entire company.",
    "During the meeting, my boss accidentally revealed ___.",
    "My LinkedIn profile says I'm passionate about ___.",
    "Scientists have discovered that ___ improves productivity.",
    "At the team event, no one would stop talking about ___.",
    "I got in trouble for bringing ___ to the office potluck.",
    "The real reason the project failed was ___.",
    "My New Year's resolution is to stop ___ at work.",
    "The worst office superpower would be the ability to ___.",
    "According to HR, today I will need to deal with ___.",
    "The office kitchen is now fully stocked with ___.",
    "I told IT my computer was broken because of ___.",
    "My manager wouldn't stop talking about ___.",
    "The company banned ___ after last year's incident.",
    "What I found in the office fridge was definitely ___.",
    "My career highlight so far is ___.",
    "The real reason I attended this meeting is ___.",
    "This meeting could have been about ___.",
    "The presentation was 90% ___ and 10% panic.",
    "Our biggest competitive advantage is ___.",
    "The new company policy is entirely about ___.",
    "The real reason we hit our targets was ___.",
    "This sounded like a good idea until ___ happened.",
    "We accidentally built a product that does ___.",
    "Our entire strategy depends on ___.",
    "The demo worked perfectly until ___.",
    "We lost the client because of ___.",
    "The slide deck was mostly about ___.",
    "No one expected ___ to become a problem.",
    "The meeting went off the rails when ___ showed up.",
    "The plan was simple: ___.",
    "The real MVP of this project was ___.",
    "Our biggest risk right now is ___.",
    "The office rumor this week is about ___.",
    "The CEO's new vision involves ___.",
    "The real reason people love this company is ___.",
    "The product launch failed because of ___.",
    "The only thing keeping this team together is ___.",
    "The office smells like ___.",
    "The new hire immediately suggested ___.",
    "Our roadmap somehow includes ___.",
    "The client was surprisingly excited about ___.",
    "The budget disappeared because of ___.",
    "The real reason I stayed late was ___.",
    "The team chat exploded after ___.",
    "The presentation ended with ___.",
    "Our success depends entirely on ___.",
    "The new system is powered by ___.",
    "Nobody questioned ___, and that was a mistake.",
    "The project slowly turned into ___.",
    "The highlight of the meeting was ___.",
    "The company retreat featured ___.",
    "The real reason this works is ___.",
    "The office legend says it started with ___.",
    "The update email mentioned ___.",
    "The real problem here is ___.",
    "Everything changed when ___ happened.",
    "The plan completely ignored ___.",
    "The training session was mostly about ___.",
    "The unexpected benefit of this job is ___.",
    "The real reason the printer is broken is ___.",
    "The most confusing part was ___.",
    "The team bonded over ___.",
    "The system crashed because of ___.",
    "The solution somehow involved ___.",
    "The meeting started with ___.",
    "The project ended with ___.",
    "The office mystery revolves around ___.",

    // ─── Multi-blank (big laughs + combos) ───
    "I traded ___ for ___ and honestly it was worth it.",
    "When life gives you ___, make ___.",
    "Step 1: ___. Step 2: ___. Step 3: Profit.",
    "In a world full of ___, be ___.",
    "___ is just ___ with extra steps.",
    "I asked for ___ but got ___ instead.",
    "The difference between ___ and ___ is surprisingly small.",
    "The best combo is ___ and ___ on a Friday afternoon.",
    "Our marketing strategy is ___ mixed with ___.",
    "We replaced ___ with ___ and called it innovation.",
    "The pitch sounded like ___ but felt like ___.",
    "Our product is basically ___ for people who love ___.",
    "We expected ___ but got ___ instead.",
    "The plan was ___, but reality was ___.",
    "The meeting was about ___ but turned into ___.",
    "The feature was designed for ___ but used for ___.",
    "The problem started with ___ and escalated into ___.",
    "We built ___, but users wanted ___.",
    "The idea began with ___ and ended with ___.",
    "The strategy looked like ___ but felt like ___.",
    "We tried ___ and accidentally created ___.",
    "The project combined ___ with ___ in a bold way.",
    "The solution required ___ and a bit of ___.",
    "The real difference between ___ and ___ is confidence.",
    "We thought it was ___, but it was actually ___.",
    "The company values ___ but rewards ___.",
    "The roadmap promised ___ but delivered ___.",
    "The concept mixes ___ with ___ for maximum impact.",
    "The plan involved ___, ___, and somehow ___.",
    "We solved ___ by introducing ___.",
];
// ─── ANSWER CARDS ───
const ANSWER_CARDS = [
    "A suspicious amount of cheese",
    "Passive-aggressive post-it notes",
    "A haunted IKEA shelf",
    "Weaponized glitter",
    "Unsolicited career advice",
    "A sentient Roomba with trust issues",
    "Competitive yodeling",
    "An inappropriately timed kazoo solo",
    "Three raccoons in a trench coat",
    "A strongly worded letter to God",
    "Expired yogurt and false hope",
    "Accidentally joining a cult",
    "Existential dread in a party hat",
    "A PowerPoint about my feelings",
    "The forbidden drawer",
    "My browser history",
    "An unexpected mariachi band",
    "Extreme couponing gone wrong",
    "An uncomfortably warm handshake",
    "A LinkedIn message from Satan",
    "The overwhelming smell of burnt ambition",
    "Two possums and a dream",
    "Microwaving fish in the office",
    "A fake mustache and zero dignity",
    "Screaming into the void (but politely)",
    "A suspicious puddle",
    "A life-sized cardboard cutout of Nicolas Cage",
    "Anxiety with a side of nachos",
    "A motivational tattoo in Comic Sans",
    "Oversharing at a dinner party",
    "17 tabs open and none of them useful",
    "A conspiracy theory about pigeons",
    "A clog from a Dutch museum",
    "An accidental declaration of war",
    "A viking funeral for a houseplant",
    "Crying at IKEA",
    "A trebuchet full of pudding",
    "Whispering sweet nothings to a sandwich",
    "An extremely judgmental cat",
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
    "A meeting that could have been a Slack message",
    "“Let’s circle back” energy",
    "A broken coffee machine uprising",
    "Corporate jargon gone feral",
    "An intern with too much confidence",
    "A KPI nobody understands",
    "A printer that senses fear",
    "Accidentally replying-all",
    "A calendar full of fake meetings",
    "A startup idea involving AI and sandwiches",
    "A Slack message sent at 2:47 AM",
    "A whiteboard full of lies",
    "A budget spreadsheet with feelings",
    "A team-building exercise gone rogue",
    "A CEO who discovered emojis",
    "A meeting about having fewer meetings",
    "An email marked “urgent” that isn’t",
    "A brainstorming session fueled by snacks",
    "A rebrand nobody asked for",
    "A coffee that tastes like disappointment",
    "Office goblins",
    "Mild chaos",
    "Spreadsheet magic",
    "Printer rage",
    "Calendar Tetris",
    "Coffee panic",
    "Silent judgment",
    "Buzzword soup",
    "Meeting fog",
    "Snack diplomacy",
    "Email anxiety",
    "Reply-all regret",
    "Low battery",
    "High hopes",
    "Fake urgency",
    "Soft panic",
    "Hard pass",
    "Bold assumptions",
    "Tiny victories",
    "Big yikes",
    "Vague goals",
    "Random pivot",
    "Late feedback",
    "Quick sync",
    "Deep sigh",
    "Office lore",
    "Weird energy",
    "Desk chaos",
    "Brain lag",
    "Idea overload",
    "Budget vibes",
    "Time warp",
    "Task limbo",
    "Work gremlins",
    "Deadline panic",
    "Strategic confusion",
    "Casual genius",
    "Group silence",
    "Awkward pause",
    "Mystery smell",
    "Instant regret",
    "Half a plan",
    "Full nonsense",
    "Team spirit",
    "Forced fun",
    "Quiet quitting",
    "Snack break",
    "Laptop sigh",
    "Muted mic",
    "Camera off",
    "Zoom fatigue",
    "Slack spiral",
    "Inbox zero?",
    "Monday energy",
    "Friday mood",
    "Overthinking it",
    "Underprepared",
    "Overprepared",
    "Last-minute brilliance",
    "Accidental success",
    "Bio breaks",
    "Teams crashing",
];
const HAND_SIZE = 7;
const ROUND_TIME = 120;
const VOTE_TIME = 300;

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

// ─── Sanitize player data for client (strip internal properties like Timeout objects) ───
function sanitizePlayers(players) {
    const clean = {};
    for (const [pid, p] of Object.entries(players)) {
        clean[pid] = { nickname: p.nickname };
    }
    return clean;
}

// ─── Broadcast player status (sidebar scoreboard + ready state) ───
function broadcastPlayerStatus(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const game = lobby.game;
    const players = Object.keys(lobby.players).map(pid => ({
        id: pid,
        nickname: lobby.players[pid].nickname,
        score: game ? (game.scores[pid] || 0) : 0,
        ready: game ? !!game.submissions[pid] : false,
    }));
    io.to(lobbyId).emit("playerStatus", { players, hostId: lobby.hostId });
}

// ─── START ROUND ───
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

    // Send roundStart to each player individually (with their hand)
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

    // Broadcast player status (all not-ready)
    broadcastPlayerStatus(lobbyId);

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

// ─── END PLAY PHASE → VOTING ───
function endPlayPhase(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game) return;
    const game = lobby.game;
    clearTimeout(game.timer);
    clearInterval(game.tickInterval);
    game.phase = "voting";
    game.votes = {};

    // Auto-submit partial/empty answers for players who didn't submit
    for (const pid of Object.keys(lobby.players)) {
        if (!game.submissions[pid]) {
            // Submit whatever they had selected (empty array = blank sentence)
            game.submissions[pid] = [];
        }
    }

    const submissionsList = Object.entries(game.submissions).map(([pid, cards]) => {
        let filled = game.currentSentence;
        cards.forEach(c => {
            filled = filled.replace("___", "<strong>" + c + "</strong>");
        });
        // Replace any remaining unfilled blanks
        filled = filled.replace(/___/g, '<strong class="unfilled">______</strong>');
        return { ownerId: pid, filledSentence: filled };
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

    // Broadcast status (all ready now since round ended)
    broadcastPlayerStatus(lobbyId);

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
        filled = filled.replace(/___/g, '<strong class="unfilled">______</strong>');
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

    // Update sidebar with new scores
    broadcastPlayerStatus(lobbyId);

    game.timer = setTimeout(() => {
        startRound(lobbyId);
    }, 10000);
}

// ═══════════════════════════════════════
// SOCKET HANDLING
// ═══════════════════════════════════════
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
        console.log("Lobby created:", lobbyId, "by", nickname, playerId);
        callback({ lobbyId, playerId });
        io.to(lobbyId).emit("lobbyUpdate", {
            hostId: lobbies[lobbyId].hostId,
            players: sanitizePlayers(lobbies[lobbyId].players),
        });
    });

    // JOIN LOBBY
    socket.on("joinLobby", ({ lobbyId, nickname, playerId: reqPlayerId }, callback) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) {
            console.log("joinLobby FAIL: lobby not found", lobbyId);
            return callback({ error: "Lobby not found" });
        }

        const pid = reqPlayerId && lobby.players[reqPlayerId] ? reqPlayerId : null;
        console.log("joinLobby:", lobbyId, "nick:", nickname, "reqPid:", reqPlayerId, "found:", !!pid, "phase:", lobby.game?.phase);

        if (pid) {
            // Reconnecting existing player — update socket
            lobby.players[pid].socketId = socket.id;
            if (nickname) lobby.players[pid].nickname = nickname;
            if (lobby.players[pid]._disconnectTimer) {
                clearTimeout(lobby.players[pid]._disconnectTimer);
                delete lobby.players[pid]._disconnectTimer;
            }
            socket.join(lobbyId);
            socket.data.lobbyId = lobbyId;
            socket.data.playerId = pid;
            callback({ lobbyId, playerId: pid });

            // If game is waiting for players to reconnect after gameStarted
            if (lobby.game && lobby.game.phase === "waiting" && lobby.game._reconnected) {
                lobby.game._reconnected.add(pid);
                console.log("Player reconnected during waiting:", pid, "reconnected:", lobby.game._reconnected.size, "/", Object.keys(lobby.players).length);
                const allBack = Object.keys(lobby.players).every(p => lobby.game._reconnected.has(p));
                if (allBack) {
                    console.log("All players reconnected, starting round for", lobbyId);
                    clearTimeout(lobby.game._waitTimer);
                    delete lobby.game._waitTimer;
                    delete lobby.game._reconnected;
                    startRound(lobbyId);
                }
            }
            // If game is already in a round, resend the current state to this player
            else if (lobby.game && lobby.game.phase === "playing") {
                console.log("Resending roundStart to reconnected player:", pid);
                io.to(socket.id).emit("roundStart", {
                    round: lobby.game.round,
                    sentence: lobby.game.currentSentence,
                    blanksNeeded: lobby.game.blanksNeeded,
                    hand: lobby.game.hands[pid] || [],
                    timeLeft: Math.max(0, Math.ceil((lobby.game.timerEnd - Date.now()) / 1000)),
                });
            }

            // Always send player status when game exists
            if (lobby.game) {
                broadcastPlayerStatus(lobbyId);
            }
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
            console.log("New player joined:", newPid, nickname);
            callback({ lobbyId, playerId: newPid });
        }

        io.to(lobbyId).emit("lobbyUpdate", {
            hostId: lobby.hostId,
            players: sanitizePlayers(lobby.players),
        });
    });

    // REQUEST GAME STATE — client can ask for current state after reconnecting
    socket.on("requestGameState", ({ lobbyId }, callback) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return callback({ error: "Lobby not found" });
        const pid = socket.data.playerId;
        const game = lobby.game;
        console.log("requestGameState:", lobbyId, "pid:", pid, "phase:", game?.phase);

        if (!game || !pid) return callback({ phase: null });

        // Always send player status
        broadcastPlayerStatus(lobbyId);

        if (game.phase === "waiting") {
            return callback({ phase: "waiting" });
        }
        if (game.phase === "playing") {
            const timeLeft = Math.max(0, Math.ceil((game.timerEnd - Date.now()) / 1000));
            return callback({
                phase: "playing",
                round: game.round,
                sentence: game.currentSentence,
                blanksNeeded: game.blanksNeeded,
                hand: game.hands[pid] || [],
                timeLeft,
                alreadySubmitted: !!game.submissions[pid],
            });
        }
        if (game.phase === "voting") {
            const submissionsList = Object.entries(game.submissions).map(([id, cards]) => {
                let filled = game.currentSentence;
                cards.forEach(c => { filled = filled.replace("___", "<strong>" + c + "</strong>"); });
                filled = filled.replace(/___/g, '<strong class="unfilled">______</strong>');
                return { ownerId: id, filledSentence: filled };
            });
            const timeLeft = Math.max(0, Math.ceil((game.timerEnd - Date.now()) / 1000));
            return callback({
                phase: "voting",
                submissions: shuffleArray(submissionsList),
                myId: pid,
                timeLeft,
                alreadyVoted: !!game.votes[pid],
            });
        }
        if (game.phase === "results") {
            return callback({ phase: "results" });
        }
        callback({ phase: game.phase });
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
        console.log("Starting game for lobby:", lobbyId, "players:", Object.keys(lobby.players).length);
        lobby.game = {
            round: 0,
            phase: "waiting",
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
            _reconnected: new Set(),
        };
        for (const pid of Object.keys(lobby.players)) {
            lobby.game.scores[pid] = 0;
        }

        io.to(lobbyId).emit("gameStarted", { lobbyId });

        // Wait up to 5 seconds for all players to reconnect on game.html, then start anyway
        lobby.game._waitTimer = setTimeout(() => {
            if (lobby.game && lobby.game.phase === "waiting") {
                console.log("Wait timeout reached, starting round for", lobbyId);
                delete lobby.game._reconnected;
                delete lobby.game._waitTimer;
                startRound(lobbyId);
            }
        }, 5000);
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
        console.log("Player submitted:", pid, cards);
        game.submissions[pid] = cards;
        const hand = game.hands[pid] || [];
        cards.forEach(c => {
            const idx = hand.indexOf(c);
            if (idx !== -1) hand.splice(idx, 1);
        });
        game.hands[pid] = hand;
        socket.emit("submitAck", { ok: true });

        // Broadcast updated player status (shows who's ready)
        broadcastPlayerStatus(lobbyId);

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

    // ─── REMOVE PLAYER helper (used by leave and kick) ───
    function removePlayerFromLobby(lobbyId, pid) {
        const lobby = lobbies[lobbyId];
        if (!lobby || !lobby.players[pid]) return;

        // Clear any disconnect timer
        if (lobby.players[pid]._disconnectTimer) {
            clearTimeout(lobby.players[pid]._disconnectTimer);
        }

        // Remove from players
        delete lobby.players[pid];

        // Clean up game state for this player
        if (lobby.game) {
            delete lobby.game.hands[pid];
            delete lobby.game.submissions[pid];
            delete lobby.game.votes[pid];
            delete lobby.game.scores[pid];
        }

        // Broadcast updates
        io.to(lobbyId).emit("lobbyUpdate", {
            hostId: lobby.hostId,
            players: sanitizePlayers(lobby.players),
        });
        broadcastPlayerStatus(lobbyId);

        // If no players left, clean up lobby
        if (Object.keys(lobby.players).length === 0) {
            if (lobby.game) {
                clearTimeout(lobby.game.timer);
                clearInterval(lobby.game.tickInterval);
            }
            delete lobbies[lobbyId];
            console.log("Lobby deleted (empty):", lobbyId);
            return;
        }

        // If game is in progress, check if all remaining players have submitted/voted
        if (lobby.game) {
            if (lobby.game.phase === "playing") {
                checkAllSubmitted(lobbyId);
            } else if (lobby.game.phase === "voting") {
                checkAllVoted(lobbyId);
            }
        }
    }

    // LEAVE GAME (player voluntarily leaves)
    socket.on("leaveGame", ({ lobbyId }) => {
        const pid = socket.data.playerId;
        if (!pid || !lobbyId) return;
        console.log("Player leaving:", pid, "from", lobbyId);
        removePlayerFromLobby(lobbyId, pid);
        socket.leave(lobbyId);
        socket.data.lobbyId = null;
        socket.data.playerId = null;
    });

    // KICK PLAYER (host only)
    socket.on("kickPlayer", ({ lobbyId, playerId: targetPid }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        // Only the host can kick
        if (lobby.hostId !== socket.data.playerId) return;
        // Can't kick yourself
        if (targetPid === socket.data.playerId) return;

        const targetPlayer = lobby.players[targetPid];
        if (!targetPlayer) return;

        console.log("Host kicking player:", targetPid, "from", lobbyId);

        // Send kicked event to the target player's socket
        const targetSid = targetPlayer.socketId;
        if (targetSid) {
            io.to(targetSid).emit("kicked");
        }

        // Remove them
        removePlayerFromLobby(lobbyId, targetPid);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
        const lobbyId = socket.data.lobbyId;
        const pid = socket.data.playerId;
        if (!lobbyId || !pid) return;
        const lobby = lobbies[lobbyId];
        if (!lobby || !lobby.players[pid]) return;

        const timeout = lobby.game ? 60000 : 15000;
        lobby.players[pid]._disconnectTimer = setTimeout(() => {
            const l = lobbies[lobbyId];
            if (!l || !l.players[pid]) return;
            // Only remove if still disconnected (socketId hasn't changed)
            if (l.players[pid].socketId === socket.id) {
                console.log("Removing disconnected player:", pid);
                delete l.players[pid];
                io.to(lobbyId).emit("lobbyUpdate", {
                    hostId: l.hostId,
                    players: sanitizePlayers(l.players),
                });
                if (Object.keys(l.players).length === 0) {
                    if (l.game) {
                        clearTimeout(l.game.timer);
                        clearInterval(l.game.tickInterval);
                    }
                    delete lobbies[lobbyId];
                    console.log("Lobby deleted:", lobbyId);
                }
            }
        }, timeout);
    });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
