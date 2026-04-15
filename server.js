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
// PHONE joins session
if (msg.startsWith("JOIN:")) {
    const id = msg.split(":")[1];
    if (sessions[id].phone) {
    ws.send("ERROR:SESSION_FULL");
    return;
}

    if (sessions[id]) {
        sessions[id].phone = ws;
        ws.sessionId = id;

        ws.send("JOINED:" + id); // ✅ confirm success
        console.log("Phone joined:", id);
    } else {
        ws.send("ERROR:INVALID_SESSION"); // ❌ reject
    }
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
            session.phone.send(msg);
        }

        // phone → game (optional)
        if (ws === session.phone && session.game) {
            session.game.send(msg);
        }
    });

    ws.on("close", () => {
        const id = ws.sessionId;
        if (!id || !sessions[id]) return;

        const session = sessions[id];

        console.log("Disconnected:", id);

        // 📱 phone disconnected
        if (ws === session.phone) {
            session.phone = null;

            if (session.game) {
                session.game.send("PHONE_DISCONNECTED");
            }

            scheduleSessionDeletion(id);
        }

        //  game disconnected → delete immediately
        if (ws === session.game) {
            delete sessions[id];
            console.log("Game closed session:", id);
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