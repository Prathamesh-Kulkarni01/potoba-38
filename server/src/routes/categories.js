const express = require('express');
const { getCategories, createCategory } = require('../controllers/categories');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// Usage:
// - GET `/api/restaurants/:restaurantId/categories` to fetch all categories for a restaurant.
// - POST `/api/restaurants/:restaurantId/categories` to create a new category.
// Both routes require authentication using the `authenticate` middleware.
router.route('/')
  .get(authenticate, getCategories)
  .post(authenticate, createCategory);

module.exports = router;
