const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');

// @desc    Get all tables for a restaurant
// @route   GET /api/restaurants/:restaurantId/tables
// @access  Private
exports.getTables = async (req, res) => {
  try {
    if (!req.params.restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

    req.body.restaurant = req.params.restaurantId;

    const restaurant = await Restaurant.findById(req.params.restaurantId);

console.log('Restaurant ID:', restaurant,req.user._id); // Log the restaurant ID for debugging
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant?.owner?.toString() !== req.user._id?.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this restaurant'
      });
    }

    const tables = await Table.find({ restaurant: req.params.restaurantId });

    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single table
// @route   GET /api/restaurants/:restaurantId/tables/:id
// @access  Private
exports.getTable = async (req, res) => {
  try {
    if (!req.params.restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    const restaurant = await Restaurant.findById(table.restaurant);

    // Make sure user owns the restaurant
     if (restaurant?.owner?.toString() !== req.user._id?.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this table'
      });
    }

    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new table
// @route   POST /api/restaurants/:restaurantId/tables
// @access  Private
exports.createTable = async (req, res) => {
  try {
    if (!req.params.restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

    if (!req.body.tableNumber) {
      return res.status(400).json({
        success: false,
        error: 'Table number is required'
      });
    }

    // Add restaurant to req.body
    req.body.restaurant = req.params.restaurantId;

    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant?.owner?.toString() !== req.user._id?.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to add tables to this restaurant'
      });
    }

    try {
      console.log(req.body)
      const table = await Table.create(req.body);

      res.status(201).json({
        success: true,
        data: table
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update table
// @route   PUT /api/restaurants/:restaurantId/tables/:id
// @access  Private
exports.updateTable = async (req, res) => {
  try {
    if (!req.params.restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

    if (req.body.tableNumber === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Table number is required'
      });
    }



    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    // Make sure user owns the restaurant
     if (restaurant?.owner?.toString() !== req.user._id?.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized to update tables for this restaurant' });
    }

    try {
      const table = await Table.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });

      if (!table) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }

      res.json({ success: true, data: table });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate table number'
        });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete table
// @route   DELETE /api/restaurants/:restaurantId/tables/:id
// @access  Private
exports.deleteTable = async (req, res) => {
  try {
    if (!req.params.restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    const restaurant = await Restaurant.findById(req.params.restaurantId);

    // Make sure restaurant exists
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
     if (restaurant?.owner?.toString() !== req.user._id?.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete tables from this restaurant'
      });
    }

    await table.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
