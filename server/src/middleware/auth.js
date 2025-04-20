
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Check for mock token in development
      if (token === 'mock-jwt-token' && process.env.NODE_ENV !== 'production') {
        // For development, allow a mock token
        req.user = { id: 'mock-user-id' };
        console.log('⚠️ Using mock authentication token');
        return next();
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.log('🔴 User not found for token:', token);
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      console.log('✅ Auth successful for user:', req.user.email || req.user.id);
      next();
    } catch (error) {
      console.error('🔴 Auth error:', error.message);
      return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  } else {
    console.log('🔴 No token provided in request');
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
};

module.exports = { protect };
