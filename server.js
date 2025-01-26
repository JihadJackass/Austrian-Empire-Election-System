const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp'); // Optional: For image resizing if needed

const app = express();
const PORT = 3000; // You can change this port as needed

// Serve static files and parse JSON
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/flags', express.static(path.join(__dirname, 'flags')));

// Multer configuration for file uploads with file size limit (e.g., 2MB)
const upload = multer({
    dest: 'flags/',
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB limit
});

// Placeholder for game data (votes, etc.)
let gameData = { votes: {} };
let currentFlagUrl = '/flags/default_flag.png'; // Default Austrian flag

// API endpoint for game data (e.g., voting results)
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

// Endpoint to get the current flag
app.get('/api/flag', (req, res) => {
    const flagExists = fs.existsSync(path.join(__dirname, currentFlagUrl.replace('/flags/', 'flags/')));
    res.json({ flagUrl: flagExists ? currentFlagUrl : '/flags/fallback_flag.png' });
});

// Endpoint to set the flag via URL
app.post('/api/flag', (req, res) => {
    const { flagUrl } = req.body;

    if (flagUrl) {
        currentFlagUrl = flagUrl;
        res.json({ message: 'Flag updated successfully.', flagUrl });
    } else {
        res.status(400).json({ message: 'Invalid flag URL.' });
    }
});

// Endpoint to upload a flag via file
app.post('/api/flag/upload', upload.single('flag'), (req, res) => {
    const filePath = `flags/${req.file.filename}`;
    const resizedPath = `flags/${req.file.filename}.png`; // Resized flag path

    // Optional: Resize the uploaded image (uncomment if resizing is required)
    sharp(req.file.path)
        .resize(300, 150) // Resize to 300x150 pixels (adjust as needed)
        .toFile(resizedPath, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error processing image.' });
            }

            // Update the current flag URL and delete the original file
            currentFlagUrl = `/${resizedPath}`;
            fs.unlink(req.file.path, () => {}); // Delete original unprocessed file
            res.json({ message: 'Flag uploaded and resized successfully.', flagUrl: currentFlagUrl });
        });

    // If resizing isn't needed, use this block instead:
    // currentFlagUrl = `/${filePath}`;
    // res.json({ message: 'Flag uploaded successfully.', flagUrl: currentFlagUrl });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
