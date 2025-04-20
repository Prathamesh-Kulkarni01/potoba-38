const express = require('express');
const { getCategories, createCategory } = require('../controllers/categories');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(authenticate, getCategories)
  .post(authenticate, createCategory);

module.exports = router;
