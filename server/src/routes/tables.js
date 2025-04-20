
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

// Re-route orders for a specific table
router.use('/:tableId/orders', ordersRouter);

// All table routes require authentication
router.route('/')
  .get(protect, getTables)
  .post(protect, createTable);

router.route('/:id')
  .get(protect, getTable)
  .put(protect, updateTable)
  .delete(protect, deleteTable);

module.exports = router;
