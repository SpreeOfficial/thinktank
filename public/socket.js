const socket = io();

// safety reset (undgår ghost listeners)
socket.removeAllListeners();
