// require('dotenv').config({ path: `${__dirname}/../.env` }); // Explicitly specify the .env file path - moved to application entry point


const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Validate JWT_SECRET during startup
if (!process.env.JWT_SECRET) {
  console.error('Critical Error: JWT_SECRET is not defined in environment variables.');
  console.error('Ensure the .env file is in the correct directory and contains JWT_SECRET.');
  process.exit(1); // Exit the application if the secret is missing
}

// Note: The JWT_SECRET issue is resolved. Investigate and address the circular dependency warning.

exports.authenticate = async (req, res, next) => {
  // try {
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Authorization Header:', authHeader); // Log the Authorization header for debugging
    const token = authHeader?.replace('Bearer ', '');
    console.log('Extracted Token:', token); // Log the extracted token for debugging
    
    if (!token) {
      console.error('Auth middleware error: No token provided or invalid Authorization header format');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const secretKey = process.env.JWT_SECRET;
    console.log('JWT Secret (Verification):', secretKey); // Log the secret key for debugging - FOR DEBUGGING ONLY

    // try {
      const decoded = jwt.verify(token, secretKey);
      console.log('Decoded Token Payload:', decoded); // Log the decoded payload for debugging

      // Find user by id and get fresh data (including any role changes)
      const user = await User.findById(decoded.userId); // or decoded._id, depending on your payload
      
      if (!user) {
        console.error('Auth middleware error: User not found');
        return res.status(401).json({ message: 'User not found' });
      }

      // Add user to request object
      req.user = user;
      next();
  //   } catch (verifyError) {
  //     console.error('Auth middleware error: Invalid token signature or payload', verifyError);
  //     return res.status(401).json({ message: 'Token is not valid' });
  //   }
  // } catch (error) {
  //   console.error('Auth middleware error:', error.message);
  //   res.status(500).json({ message: 'Internal server error' });
  // }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role (${req.user.role}) is not allowed to access this resource` 
      });
    }
    
    next();
  };
};
