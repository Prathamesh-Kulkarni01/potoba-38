
const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

// Admin dashboard data route
router.get('/dashboard', authenticate, authorizeRoles('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Admin access granted',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Get all users route (admin only)
router.get('/users', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
