const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Enable CORS for development
app.use(cors({
    origin: 'http://localhost:5001',
    credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route (existing auth tester)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// New player route
app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// Auth routes
const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));