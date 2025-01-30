const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.generateAuthUrl);
router.get('/callback', authController.handleCallback);
router.post('/token', authController.exchangeCodeForToken);
router.post('/refresh', authController.refreshToken);

module.exports = router;