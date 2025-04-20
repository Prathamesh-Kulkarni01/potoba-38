const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orders');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const { authenticate } = require('../middleware/authMiddleware');

// Usage:
// - GET `/api/restaurants/:restaurantId/orders` to fetch all orders for a restaurant.
// - POST `/api/restaurants/:restaurantId/orders` to create a new order.
// - GET `/api/restaurants/:restaurantId/orders/:id` to fetch a specific order.
// - PUT `/api/restaurants/:restaurantId/orders/:id` to update an order.
// - DELETE `/api/restaurants/:restaurantId/orders/:id` to delete an order.
// - PATCH `/api/restaurants/:restaurantId/orders/:id/status` to update the status of an order.
// All routes require authentication using the `authenticate` middleware.
router.route('/')
  .get(authenticate, getOrders)
  .post(authenticate, createOrder);

router.route('/:id')
  .get(authenticate, getOrder)
  .put(authenticate, updateOrder)
  .delete(authenticate, deleteOrder);

router.route('/:id/status')
  .patch(authenticate, updateOrderStatus);

module.exports = router;
