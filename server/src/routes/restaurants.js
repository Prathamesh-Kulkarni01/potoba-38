
const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// Get all restaurants for the logged in user
router.get('/', auth, async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.userId });
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific restaurant
router.get('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ 
      _id: req.params.id, 
      owner: req.userId 
    });
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new restaurant
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating restaurant for user:', req.userId);
    console.log('Restaurant data:', req.body);
    
    const restaurant = new Restaurant({
      ...req.body,
      owner: req.userId
    });
    
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a restaurant
router.put('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ 
      _id: req.params.id, 
      owner: req.userId 
    });
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    Object.keys(req.body).forEach(key => {
      restaurant[key] = req.body[key];
    });
    
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a restaurant
router.delete('/:id', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOneAndDelete({ 
      _id: req.params.id, 
      owner: req.userId 
    });
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
