const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// === Basic Auth setup ===
// Change 'admin' and 'yourpassword' to whatever you like
const user = process.env.BASIC_USER;
const pass = process.env.BASIC_PASS;
app.use(basicAuth({
    users: { [user]: pass },
    challenge: true, // Prompts the browser to show login
}));


// Store connected ESP32 clients
const espClients = new Set();

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = message.toString();
        console.log('Received:', data);

        try {
            const parsed = JSON.parse(data);

            // Mark device as ESP32
            if (parsed.type === 'identify' && parsed.device === 'esp32_relay') {
                ws.deviceType = 'esp32';
                ws.ip = parsed.ip;
                ws.heap = parsed.heap;
                ws.rssi = parsed.rssi;
                espClients.add(ws);
                console.log(`[ESP32] Registered: ${parsed.ip}`);
            }

            if (parsed.type === 'heartbeat') {
                ws.lastHeartbeat = Date.now();
                ws.heap = parsed.heap;
                ws.rssi = parsed.rssi;
            }

            if (parsed.type === 'status') {
                console.log(`[STATUS] Relay ${parsed.relay} is ${parsed.state}, heap=${parsed.heap}`);
            }

        } catch (e) {
            console.log('Non-JSON message:', data);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        espClients.delete(ws);
    });
});

// API endpoint to control relays
app.post('/api/control', (req, res) => {
    const { relay, action } = req.body;

    if (!relay || !action) {
        return res.status(400).json({ error: 'Missing relay or action' });
    }

    if (!['relay1', 'relay2'].includes(relay) || !['on', 'off'].includes(action)) {
        return res.status(400).json({ error: 'Invalid relay or action' });
    }

    const message = { command: `${relay}_${action}` };

    let sent = false;
    espClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
            sent = true;
        }
    });

    if (sent) {
        res.json({ success: true, message: `Command sent: ${message.command}` });
    } else {
        res.status(503).json({ error: 'No ESP32 devices connected' });
    }
});

// Status endpoint
app.get('/api/status', (req, res) => {
    const devices = Array.from(espClients).map(ws => ({
        ip: ws.ip,
        heap: ws.heap,
        rssi: ws.rssi,
        lastSeen: ws.lastHeartbeat
    }));

    res.json({
        connectedDevices: espClients.size,
        devices,
        status: espClients.size > 0 ? 'connected' : 'disconnected'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
