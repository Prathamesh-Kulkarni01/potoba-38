const Category = require('../models/Category');
const Restaurant = require('../models/Restaurant');

// @desc    Get all categories for a restaurant
// @route   GET /api/restaurants/:restaurantId/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ restaurant: req.params.restaurantId });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a new category
// @route   POST /api/restaurants/:restaurantId/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    req.body.restaurant = req.params.restaurantId;

    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
