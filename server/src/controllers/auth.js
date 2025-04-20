const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET||'your-secret-key-here', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Set default permissions based on role
    const permissions = getDefaultPermissions(role || 'user');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      permissions
    });

    if (user) {
      // Populate the restaurants field
      await user.populate('restaurants');
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            restaurants: user.restaurants
          },
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid user data'
      });
    }
  } catch (error) {
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
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    // Updated error messages for better clarity
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Please try again.'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    // Updated error messages for better clarity
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Please try again.'
      });
    }

    // Populate the restaurants field
    await user.populate('restaurants');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          restaurants: user.restaurants
        },
        token: generateToken(user._id)
      }
    });
  } catch (error) {
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
    res.json({
      success: true
    });
  } catch (error) {
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
    const user = await User.findById(req.user.id).populate('restaurants');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          restaurants: user.restaurants
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user role and permissions
// @route   PUT /api/auth/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const { role, permissions } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update user role
    if (role) {
      user.role = role;
      // Assign default permissions for the role if no custom permissions provided
      if (!permissions) {
        user.permissions = getDefaultPermissions(role);
      }
    }
    
    // Update permissions if provided
    if (permissions) {
      user.permissions = permissions;
    }
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to get default permissions based on role
const getDefaultPermissions = (role) => {
  switch (role) {
    case 'admin':
      return [
        'view_dashboard',
        'manage_tables',
        'manage_menu',
        'manage_orders',
        'manage_marketing',
        'manage_loyalty',
        'manage_settings',
        'manage_users'
      ];
    case 'manager':
      return [
        'view_dashboard',
        'manage_tables',
        'manage_menu',
        'manage_orders',
        'manage_marketing',
        'manage_loyalty'
      ];
    case 'staff':
      return [
        'view_dashboard',
        'manage_tables',
        'manage_orders'
      ];
    case 'user':
    default:
      return ['view_dashboard'];
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Private
exports.refreshToken = async (req, res) => {
  try {
    // User is already attached to req by the auth middleware
    const user = req.user;

    // Generate a new token with current user data (including any role changes)
    const payload = user.getJwtPayload();
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
