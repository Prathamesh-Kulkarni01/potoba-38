
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



// All menu routes require authentication
router.route('/')
  .get(authenticate, getMenuItems)
  .post(authenticate, createMenuItem);

router.route('/:id')
  .get(authenticate, getMenuItem)
  .put(authenticate, updateMenuItem)
  .delete(authenticate, deleteMenuItem);

module.exports = router;
