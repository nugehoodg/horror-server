const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sessions = {}; // { sessionId: { game: ws, phone: ws } }

function generateSessionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on("connection", (ws) => {
    console.log("Connected");

    ws.on("message", (msg) => {
        msg = msg.toString();
        console.log("RECEIVED:", msg);

        // GAME creates session
        if (msg === "CREATE_SESSION") {
            const id = generateSessionId();
            sessions[id] = { game: ws, phone: null };

            ws.sessionId = id;

            ws.send("SESSION:" + id);
            console.log("Session created:", id);
            return;
        }

        // PHONE joins session
        if (msg.startsWith("JOIN:")) {
            const id = msg.split(":")[1];

            if (sessions[id]) {
                sessions[id].phone = ws;
                ws.sessionId = id;

                console.log("Phone joined:", id);
            } else {
                ws.send("ERROR:INVALID_SESSION");
            }
            return;
        }

        // NORMAL MESSAGE
        const id = ws.sessionId;

        if (!id || !sessions[id]) return;

        const session = sessions[id];

        // forward game → phone
        if (ws === session.game && session.phone) {
            session.phone.send(msg);
        }
    });

    ws.on("close", () => {
        const id = ws.sessionId;
        if (id && sessions[id]) {
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