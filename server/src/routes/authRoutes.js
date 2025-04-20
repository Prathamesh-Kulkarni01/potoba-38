
const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const { authenticate } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', auth.register);
router.post('/login', auth.login);

// Protected routes
router.get('/me', authenticate, auth.getCurrentUser);
router.post('/refresh-token', authenticate, auth.refreshToken);

module.exports = router;
