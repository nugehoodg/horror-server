const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let phone = null;
let game = null;

wss.on("connection", (ws) => {
    console.log("Someone connected");

    ws.on("message", (msg) => {
        msg = msg.toString();
        console.log("RECEIVED:", msg);

        if (msg === "PHONE") {
            phone = ws;
            console.log("Phone registered");
            return;
        }

        if (msg === "GAME") {
            game = ws;
            console.log("Game registered");
            return;
        }

        if (phone) {
            phone.send(msg);
        }
    });
});

app.get("/", (req, res) => {
    res.send("Server is running");
});

// 🔥 IMPORTANT
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});