const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000; // You can change this port as needed

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for game data (e.g., voting results)
let gameData = { votes: {} };

app.get('/api/game-data', (req, res) => {
    res.json(gameData);
});

// API endpoint to cast a vote
app.post('/api/vote', express.json(), (req, res) => {
    const { state, user } = req.body;

    if (!gameData.votes[state]) {
        gameData.votes[state] = [];
    }
    gameData.votes[state].push(user);

    res.json({ message: `Vote recorded for ${state} by ${user}.` });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});