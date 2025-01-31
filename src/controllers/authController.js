const crypto = require('crypto');
const querystring = require('querystring');
const axios = require('axios');
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
const frontendRedirect = process.env.FRONTEND_REDIRECT_URI;

let currentToken = {};
const codeVerifierStore = new Map();

const generateAuthUrl = (req, res) => {
    const codeVerifier = crypto.randomBytes(64).toString('hex');
    const state = crypto.randomBytes(16).toString('hex');

    codeVerifierStore.set(state, codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state',
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
        state: state
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
};

const handleCallback = async (req, res) => {
    const { code, state } = req.query;
    const storedState = codeVerifierStore.get(state);
    if (!storedState) return res.status(400).send('Invalid state');

    try {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: storedState
        });

        const response = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        currentToken = {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
        };

        res.redirect('/player');
    } catch (error) {
        console.error(error);
        res.status(400).send('Token exchange failed');
    }
};

const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
    });

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        currentToken = {
            ...currentToken,
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token || currentToken.refresh_token,
        };

        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Refresh failed' });
    }
};

const getToken = (req, res) => {
    if (!currentToken || !currentToken.access_token) {
        return res.status(400).json({ error: 'No token available' });
    }
    res.json({ access_token: currentToken.access_token });
};

module.exports = {
    generateAuthUrl, handleCallback, refreshToken, getToken
};