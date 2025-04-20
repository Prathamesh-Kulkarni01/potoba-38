require('dotenv').config({ path: `${__dirname}/../.env` }); // Explicitly specify the .env file path
const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken, getMe, updateUserRole } = require('../controllers/auth')
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/refresh-token', authenticate, refreshToken);
// // Admin-only routes
router.put('/users/:id/role', authenticate, authorizeRoles('admin'), updateUserRole);

module.exports = router;
