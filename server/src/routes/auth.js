
const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateUserRole } = require('../controllers/auth');
const { protect, authorize } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes (authentication required)
router.get('/me', protect, getMe);

// Admin-only routes
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);

module.exports = router;
