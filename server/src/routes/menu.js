
const express = require('express');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} = require('../controllers/menu');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

// All menu routes require authentication
router.route('/')
  .get(protect, getMenuItems)
  .post(protect, createMenuItem);

router.route('/:id')
  .get(protect, getMenuItem)
  .put(protect, updateMenuItem)
  .delete(protect, deleteMenuItem);

module.exports = router;
