const express = require('express');
const cors = require('cors');
const path = require('path'); // Add this
require('dotenv').config();

const app = express();

// Enable CORS for development
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes
const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));