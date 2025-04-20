const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');
const { authenticate } = require('../middleware/authMiddleware');
const { createDemoData } = require('../controllers/restaurants');

// Standardized error response function
const handleError = (res, error, message = 'Server error', status = 500) => {
  console.error(message, error);
  res.status(status).json({ message });
};

// Get all restaurants for the logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.user._id });
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    handleError(res, error, 'Error fetching restaurants');
  }
});

// Get a specific restaurant
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const restaurant = await Restaurant.findOne({ _id: req.params.id, owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (error) {
    handleError(res, error, 'Error fetching restaurant');
  }
});

// Create a new restaurant
router.post('/', authenticate, async (req, res) => {
  try {
    const restaurant = new Restaurant({ ...req.body, owner: req.user._id });
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    handleError(res, error, 'Error creating restaurant');
  }
});

// Create demo data for a restaurant
router.post('/:id/demo-data', authenticate, createDemoData);

// Update a restaurant
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const restaurant = await Restaurant.findOne({ _id: req.params.id, owner: req.userId });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    Object.assign(restaurant, req.body);
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    handleError(res, error, 'Error updating restaurant');
  }
});

// Delete a restaurant
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: 'Restaurant ID is required' });
    }

    const restaurant = await Restaurant.findOneAndDelete({ _id: req.params.id, owner: req.userId });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Error deleting restaurant');
  }
});

module.exports = router;
