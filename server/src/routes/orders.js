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

// All order routes require authentication
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
