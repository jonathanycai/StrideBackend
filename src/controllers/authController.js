// authController.js

const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
const frontendRedirect = process.env.FRONTEND_REDIRECT_URI;

/**
 * Stores the code_verifier for each OAuth state.
 * (In production, use a DB or Redis store keyed by user session.)
 */
const codeVerifierStore = new Map();

/**
 * In-memory token storage (replace with DB or Redis in production).
 * `expires` is a UNIX timestamp in milliseconds of when the token will expire.
 */
let currentToken = {
    access_token: null,
    refresh_token: null,
    expires_in: null,
    expires: null
};

/**
 * Helper to update the in-memory token store with new token data.
 */
const saveToken = ({ access_token, refresh_token, expires_in }) => {
    currentToken = {
        access_token,
        refresh_token,
        expires_in,
        expires: Date.now() + (expires_in * 1000) // convert seconds → ms
    };
};

/**
 * 1) Generate a PKCE code verifier and code challenge
 * 2) Create a random `state` and store `codeVerifier` in codeVerifierStore
 * 3) Redirect user to Spotify's Authorization endpoint
 */
const generateAuthUrl = (req, res) => {
    const codeVerifier = crypto.randomBytes(64).toString('hex');
    const state = crypto.randomBytes(16).toString('hex');

    // Create a code challenge from the code verifier
    const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    // Persist the codeVerifier so we can compare later in handleCallback
    codeVerifierStore.set(state, codeVerifier);

    // Add the scopes your application needs:
    // e.g. streaming, user-read-playback-state, user-modify-playback-state, etc.
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'user-read-private user-read-email streaming',
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
        state
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
};

/**
 * Handles the redirect from Spotify (the "callback"). 
 * Exchanges the `code` for tokens, saves them, and redirects to your frontend.
 */
const handleCallback = async (req, res) => {
    const { code, state } = req.query;
    const storedVerifier = codeVerifierStore.get(state);

    if (!storedVerifier) {
        return res.status(400).send('Invalid state');
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: storedVerifier
        });

        const response = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Save the tokens in our in-memory store
        saveToken(response.data);

        // Optionally redirect to your frontend with the tokens in the query string
        // or simply redirect to /player so the page can fetch tokens from getToken
        res.redirect(
            `/player`
        );

    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(400).send('Token exchange failed');
    }
};

/**
 * An optional route for exchanging a code for a token 
 * if you needed a different flow. Currently returns 501.
 */
const exchangeCodeForToken = async (req, res) => {
    res.status(501).send('Not implemented');
};

/**
 * Refresh the access token using a refresh token.
 */
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

        // Save the new tokens
        saveToken(response.data);

        res.json(response.data);
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(400).json({ error: 'Refresh failed' });
    }
};

/**
 * Return the current access token, if available and not expired.
 * If the token is expired (or doesn't exist), return a 401 error.
 */
const getToken = (req, res) => {
    if (!currentToken.access_token) {
        return res.status(401).json({ error: 'No access token available' });
    }

    // Check if the token is expired
    if (Date.now() >= currentToken.expires) {
        return res.status(401).json({ error: 'Access token expired' });
    }

    // Token is still valid
    res.json({ access_token: currentToken.access_token });
};

// Export all routes
module.exports = {
    generateAuthUrl,
    handleCallback,
    exchangeCodeForToken,
    refreshToken,
    getToken
};
