
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'your-secret-key-here';
  console.log(`🔑 Generating token with secret: ${secret.substring(0, 3)}...`);
  
  return jwt.sign({ id }, secret, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    console.log('📝 Registration attempt for:', req.body.email);
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      console.log('⚠️ Registration failed - user already exists:', email);
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Create user
    console.log('✅ Creating new user:', email);
    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      // Populate the restaurants field
      await user.populate('restaurants');
      
      const token = generateToken(user._id);
      console.log('✅ User created successfully:', user._id);
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            restaurants: user.restaurants
          },
          token
        }
      });
    } else {
      console.log('⚠️ Failed to create user - invalid data');
      res.status(400).json({
        success: false,
        error: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('🔴 Registration error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log('🔑 Login attempt for:', req.body.email);
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('⚠️ Login failed - user not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log('⚠️ Login failed - incorrect password for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Populate the restaurants field
    await user.populate('restaurants');

    const token = generateToken(user._id);
    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          restaurants: user.restaurants
        },
        token
      }
    });
  } catch (error) {
    console.error('🔴 Login error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    console.log('👋 User logged out');
    res.json({
      success: true
    });
  } catch (error) {
    console.error('🔴 Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    console.log('🔍 Getting user profile for ID:', req.user.id);
    const user = await User.findById(req.user.id).populate('restaurants');

    if (!user) {
      console.log('⚠️ User not found for ID:', req.user.id);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ User profile retrieved for:', user.email);
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          restaurants: user.restaurants
        }
      }
    });
  } catch (error) {
    console.error('🔴 Get profile error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
