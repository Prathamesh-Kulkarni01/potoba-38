
const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateUserRole } = require('../controllers/auth');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);

module.exports = router;
