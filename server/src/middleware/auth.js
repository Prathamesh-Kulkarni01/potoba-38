
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
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
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
};

// Check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized, no user' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `User role ${req.user.role} is not authorized to access this route` 
      });
    }
    
    next();
  };
};

// Check permission
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized, no user' });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        error: `User does not have ${permission} permission` 
      });
    }
    
    next();
  };
};

module.exports = { protect, authorize, checkPermission };
