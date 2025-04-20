
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

const { protect } = require('../middleware/auth');

// Re-route orders for a specific table
router.use('/:tableId/orders', ordersRouter);

router.route('/')
  .get(protect, getTables)
  .post(protect, createTable);

router.route('/:id')
  .get(protect, getTable)
  .put(protect, updateTable)
  .delete(protect, deleteTable);

module.exports = router;
