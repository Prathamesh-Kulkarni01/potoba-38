const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');

// Usage:
// - `getMenuItems`: Fetch all menu items for a restaurant.
// - `getMenuItem`: Fetch a specific menu item by ID.
// - `createMenuItem`: Create a new menu item for a restaurant.
// - `updateMenuItem`: Update an existing menu item by ID.
// - `deleteMenuItem`: Delete a menu item by ID.
// All methods ensure the user owns the restaurant and the menu item belongs to the restaurant.

// @desc    Get all menu items for a restaurant
// @route   GET /api/restaurants/:restaurantId/menu
// @access  Private
exports.getMenuItems = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this restaurant'
      });
    }

    const menuItems = await MenuItem.find({ restaurant: req.params.restaurantId });

    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single menu item
// @route   GET /api/restaurants/:restaurantId/menu/:id
// @access  Private
exports.getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const restaurant = await Restaurant.findById(menuItem.restaurant);

    // Make sure user owns the restaurant
    if (restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this menu item'
      });
    }

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new menu item
// @route   POST /api/restaurants/:restaurantId/menu
// @access  Private
exports.createMenuItem = async (req, res) => {
  try {
    req.body.restaurant = req.params.restaurantId;

    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    if (restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const category = await Category.findById(req.body.category);
    if (!category || category.restaurant.toString() !== req.params.restaurantId) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    const menuItem = await MenuItem.create(req.body);
    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update menu item
// @route   PUT /api/restaurants/:restaurantId/menu/:id
// @access  Private
exports.updateMenuItem = async (req, res) => {
  try {
    let menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
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
    if (restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update menu items for this restaurant'
      });
    }

    menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete menu item
// @route   DELETE /api/restaurants/:restaurantId/menu/:id
// @access  Private
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
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
    if (restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete menu items from this restaurant'
      });
    }

    await menuItem.remove();

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
