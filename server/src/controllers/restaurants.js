
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// WebSocket reference for logging
let wss;
try {
  wss = require('../server').wss;
} catch (error) {
  console.log('WebSocket not initialized yet');
}

// Helper function to log to frontend if WebSocket is available
function logToFrontend(message) {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// @desc    Get all restaurants for authenticated user
// @route   GET /api/restaurants
// @access  Private
exports.getRestaurants = async (req, res) => {
  try {
    // Special case for mock user in development
    if (req.user.id === 'mock-user-id') {
      return res.json({
        success: true,
        data: [{
          id: 'mock-restaurant-id',
          name: 'Mock Restaurant',
          description: 'A mock restaurant for development',
          cuisine: 'Mock Cuisine',
          address: '123 Mock Street',
          phone: '555-123-4567',
          tables: 10,
          user: 'mock-user-id'
        }]
      });
    }

    const restaurants = await Restaurant.find({ user: req.user.id });

    res.json({
      success: true,
      data: restaurants
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Private
exports.getRestaurant = async (req, res) => {
  try {
    // Special case for mock user in development
    if (req.user.id === 'mock-user-id') {
      return res.json({
        success: true,
        data: {
          id: 'mock-restaurant-id',
          name: 'Mock Restaurant',
          description: 'A mock restaurant for development',
          cuisine: 'Mock Cuisine',
          address: '123 Mock Street',
          phone: '555-123-4567',
          tables: 10,
          user: 'mock-user-id'
        }
      });
    }

    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this restaurant'
      });
    }

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new restaurant
// @route   POST /api/restaurants
// @access  Private
exports.createRestaurant = async (req, res) => {
  try {
    console.log('Creating restaurant for user:', req.user.id);
    logToFrontend(`Creating restaurant for user: ${req.user.id}`);
    
    // Add user to req.body
    req.body.user = req.user.id;

    // Handle mock user in development
    if (req.user.id === 'mock-user-id') {
      console.log('Creating mock restaurant');
      return res.status(201).json({
        success: true,
        data: {
          id: `mock-restaurant-${Date.now()}`,
          ...req.body,
          createdAt: new Date().toISOString()
        }
      });
    }

    // Create the restaurant
    const restaurant = await Restaurant.create(req.body);
    console.log('Restaurant created:', restaurant);
    logToFrontend(`Restaurant created: ${restaurant.name}`);

    // Add restaurant to user
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { restaurants: restaurant._id } },
      { new: true }
    );
    
    res.status(201).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    logToFrontend(`Error creating restaurant: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private
exports.updateRestaurant = async (req, res) => {
  try {
    // Handle mock user in development
    if (req.user.id === 'mock-user-id') {
      return res.json({
        success: true,
        data: {
          id: req.params.id,
          ...req.body,
          user: 'mock-user-id'
        }
      });
    }

    let restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this restaurant'
      });
    }

    restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private
exports.deleteRestaurant = async (req, res) => {
  try {
    // Handle mock user in development
    if (req.user.id === 'mock-user-id') {
      return res.json({
        success: true,
        data: {}
      });
    }

    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this restaurant'
      });
    }

    await restaurant.deleteOne();

    // Remove restaurant from user
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { restaurants: req.params.id } },
      { new: true }
    );

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
