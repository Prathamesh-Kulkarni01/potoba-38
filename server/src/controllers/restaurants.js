const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');

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
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

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
        error: 'The requested restaurant does not exist.'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this restaurant.'
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
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

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
        error: 'The requested restaurant does not exist.'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this restaurant.'
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
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

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
        error: 'The requested restaurant does not exist.'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this restaurant.'
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

// @desc    Create demo data for a restaurant
// @route   POST /api/restaurants/:id/demo-data
// @access  Private
exports.createDemoData = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'The requested restaurant does not exist.' });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You do not have permission to access this restaurant.' });
    }

    // Create demo tables if none exist
    const existingTables = await Table.find({ restaurant: req.params.id });
    if (existingTables.length === 0) {
      const tables = Array.from({ length: restaurant.tables || 10 }, (_, i) => ({
        restaurant: req.params.id,
        number: i + 1,
        capacity: Math.floor(Math.random() * 3) + 2,
        status: 'available'
      }));
      await Table.insertMany(tables);
    }

    // Create demo menu items if none exist
    const existingMenuItems = await MenuItem.find({ restaurant: req.params.id });
    if (existingMenuItems.length === 0) {
      const menuItems = [
        { name: 'Bruschetta', description: 'Toasted bread with tomatoes and herbs', price: 7.99, category: 'Appetizers' },
        { name: 'Margherita Pizza', description: 'Classic tomato and mozzarella pizza', price: 12.99, category: 'Main Course' },
        { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 6.99, category: 'Desserts' },
        { name: 'Soft Drinks', description: 'Assorted sodas', price: 2.99, category: 'Drinks' }
      ].map(item => ({ ...item, restaurant: req.params.id }));
      await MenuItem.insertMany(menuItems);
    }

    // Create sample orders if none exist
    const existingOrders = await Order.find({ restaurant: req.params.id });
    if (existingOrders.length === 0) {
      const [tables, menuItems] = await Promise.all([
        Table.find({ restaurant: req.params.id }),
        MenuItem.find({ restaurant: req.params.id })
      ]);

      if (tables.length > 0 && menuItems.length > 0) {
        const sampleOrders = [
          {
            restaurant: req.params.id,
            tableId: tables[0]._id,
            status: 'completed',
            items: [
              { menuItemId: menuItems[0]._id, name: menuItems[0].name, price: menuItems[0].price, quantity: 2 },
              { menuItemId: menuItems[1]._id, name: menuItems[1].name, price: menuItems[1].price, quantity: 1 }
            ],
            total: menuItems[0].price * 2 + menuItems[1].price,
            createdAt: new Date(),
            completedAt: new Date()
          }
        ];
        await Order.insertMany(sampleOrders);
      }
    }

    res.json({ success: true, data: { message: 'Demo data created successfully' } });
  } catch (error) {
    console.error('Create demo data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
