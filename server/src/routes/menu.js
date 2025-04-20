const express = require('express');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} = require('../controllers/menu');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// Usage:
// - GET `/api/restaurants/:restaurantId/menu` to fetch all menu items for a restaurant.
// - POST `/api/restaurants/:restaurantId/menu` to create a new menu item.
// - GET `/api/restaurants/:restaurantId/menu/:id` to fetch a specific menu item.
// - PUT `/api/restaurants/:restaurantId/menu/:id` to update a menu item.
// - DELETE `/api/restaurants/:restaurantId/menu/:id` to delete a menu item.
// All routes require authentication using the `authenticate` middleware.
router.route('/')
  .get(authenticate, getMenuItems)
  .post(authenticate, createMenuItem);

router.route('/:id')
  .get(authenticate, getMenuItem)
  .put(authenticate, updateMenuItem)
  .delete(authenticate, deleteMenuItem);

module.exports = router;
