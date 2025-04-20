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

// All table routes require authentication
router.route('/')
  .get(authenticate, getTables)
  .post(authenticate, createTable);

router.route('/:id')
  .get(authenticate, getTable)
  .put(authenticate, updateTable)
  .delete(authenticate, deleteTable);

module.exports = router;
