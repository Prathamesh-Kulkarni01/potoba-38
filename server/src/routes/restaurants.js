const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// Standardized error response function
const handleError = (res, error, message = 'Server error', status = 500) => {
  console.error(message, error);
  res.status(status).json({ message });
};

// Get all restaurants for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.userId });
    res.json(restaurants);
  } catch (error) {
    handleError(res, error, 'Error fetching restaurants');
  }
});

// Get a specific restaurant
router.get('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, owner: req.userId });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (error) {
    handleError(res, error, 'Error fetching restaurant');
  }
});

// Create a new restaurant
router.post('/', auth, async (req, res) => {
  try {
    const restaurant = new Restaurant({ ...req.body, owner: req.userId });
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    handleError(res, error, 'Error creating restaurant');
  }
});

// Update a restaurant
router.put('/:id', auth, async (req, res) => {
  try {
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
router.delete('/:id', auth, async (req, res) => {
  try {
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
