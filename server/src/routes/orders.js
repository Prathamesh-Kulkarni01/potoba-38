
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

// All order routes require authentication
router.route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

router.route('/:id')
  .get(protect, getOrder)
  .put(protect, updateOrder)
  .delete(protect, deleteOrder);

router.route('/:id/status')
  .patch(protect, updateOrderStatus);

module.exports = router;
