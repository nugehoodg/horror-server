const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sessions = {}; 
// {
//   ABC123: {
//     game: ws,
//     phone: ws,
//     timeout: null
//   }
// }

function generateSessionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function clearSessionTimeout(session) {
    if (session.timeout) {
        clearTimeout(session.timeout);
        session.timeout = null;
    }
}

function scheduleSessionDeletion(id) {
    if (!sessions[id]) return;

    console.log("Scheduling deletion:", id);

    sessions[id].timeout = setTimeout(() => {
        delete sessions[id];
        console.log("Session expired:", id);
    }, 30000); // 30 sec grace period
}

wss.on("connection", (ws) => {
    console.log("Connected");

    ws.on("message", (msg) => {
        msg = msg.toString();
        console.log("RECEIVED:", msg);

        //  GAME creates session
        if (msg === "CREATE_SESSION") {
            const id = generateSessionId();

            sessions[id] = {
                game: ws,
                phone: null,
                timeout: null
            };

            ws.sessionId = id;

            ws.send("SESSION:" + id);
            console.log("Session created:", id);
            return;
        }

        //  PHONE joins session

if (msg.startsWith("JOIN:")) {
    const id = msg.split(":")[1];

    if (!sessions[id]) {
        ws.send("ERROR:INVALID_SESSION");
        return;
    }

    const session = sessions[id];

    // prevent crash if session is corrupted
    if (!session || typeof session !== "object") {
        ws.send("ERROR:INVALID_SESSION");
        return;
    }

    session.phone = ws;
    ws.sessionId = id;

    try {
        ws.send("JOINED:" + id);
    } catch (err) {
        console.log("Send failed:", err);
    }

    console.log("Phone joined:", id);
    return;
}

        //  MANUAL END SESSION
        if (msg === "END_SESSION") {
            const id = ws.sessionId;

            if (id && sessions[id]) {
                delete sessions[id];
                console.log("Session manually ended:", id);
            }
            return;
        }

        //  NORMAL MESSAGE FORWARDING
        const id = ws.sessionId;
        if (!id || !sessions[id]) return;

        const session = sessions[id];

        // game → phone
if (ws === session.game && session.phone) {
    try {
        session.phone.send(msg);
    } catch (err) {
        console.log("Forward error:", err);
    }
}

        // phone → game (optional)
if (ws === session.phone && session.game) {
    try {
        session.game.send(msg);
    } catch (err) {
        console.log("Forward error:", err);
    }
}
    });

ws.on("close", () => {
    const id = ws.sessionId;
    if (!id || !sessions[id]) return;

    const session = sessions[id];

    if (ws === session.game) {
        session.game = null;
    }

    if (ws === session.phone) {
        session.phone = null;
    }

    // only delete if both gone
    if (!session.game && !session.phone) {
        delete sessions[id];
        console.log("Session closed:", id);
    }
});
});

app.get("/", (req, res) => {
    res.send("Server running");
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log("Running on", PORT);
});