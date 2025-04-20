const express = require('express');
const {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable
} = require('../controllers/tables');
const ordersRouter = require('./orders');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const { authenticate } = require('../middleware/authMiddleware');

// Re-route orders for a specific table
router.use('/:tableId/orders', ordersRouter);

// Usage:
// - GET `/api/restaurants/:restaurantId/tables` to fetch all tables for a restaurant.
// - POST `/api/restaurants/:restaurantId/tables` to create a new table.
// - GET `/api/restaurants/:restaurantId/tables/:id` to fetch a specific table.
// - PUT `/api/restaurants/:restaurantId/tables/:id` to update a table.
// - DELETE `/api/restaurants/:restaurantId/tables/:id` to delete a table.
// All routes require authentication using the `authenticate` middleware.
router.route('/')
  .get(authenticate, getTables)
  .post(authenticate, createTable);

router.route('/:id')
  .get(authenticate, getTable)
  .put(authenticate, updateTable)
  .delete(authenticate, deleteTable);

module.exports = router;
