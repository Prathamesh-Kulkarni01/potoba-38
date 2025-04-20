
const express = require('express');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} = require('../controllers/menu');

const router = express.Router({ mergeParams: true });

const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getMenuItems)
  .post(protect, createMenuItem);

router.route('/:id')
  .get(protect, getMenuItem)
  .put(protect, updateMenuItem)
  .delete(protect, deleteMenuItem);

module.exports = router;
