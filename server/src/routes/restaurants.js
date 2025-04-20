
const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// @route   GET /api/restaurants
// @desc    Get all restaurants for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.userId });
    res.json(restaurants);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/restaurants/:id
// @desc    Get a specific restaurant
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Check if user is the owner of the restaurant
    if (restaurant.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this restaurant' });
    }
    
    res.json(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/restaurants
// @desc    Create a new restaurant
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, location, description, cuisine } = req.body;
    
    const restaurant = new Restaurant({
      name,
      location,
      description,
      cuisine,
      owner: req.userId
    });
    
    await restaurant.save();
    
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/restaurants/:id
// @desc    Update a restaurant
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, location, description, cuisine } = req.body;
    
    // Find restaurant
    let restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Check if user is the owner of the restaurant
    if (restaurant.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this restaurant' });
    }
    
    // Update restaurant
    restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { name, location, description, cuisine },
      { new: true }
    );
    
    res.json(restaurant);
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/restaurants/:id
// @desc    Delete a restaurant
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find restaurant
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Check if user is the owner of the restaurant
    if (restaurant.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this restaurant' });
    }
    
    await Restaurant.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
