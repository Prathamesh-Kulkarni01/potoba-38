
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant
} = require('../controllers/restaurants');

// Restaurant routes
router.route('/')
  .get(protect, getRestaurants)
  .post(protect, createRestaurant);

router.route('/:id')
  .get(protect, getRestaurant)
  .put(protect, updateRestaurant)
  .delete(protect, deleteRestaurant);

// Import nested routes
const menuRouter = require('./menu');
const tableRouter = require('./tables');
const orderRouter = require('./orders');

// Re-route into other resource routers
router.use('/:restaurantId/menu', menuRouter);
router.use('/:restaurantId/tables', tableRouter);
router.use('/:restaurantId/orders', orderRouter);

module.exports = router;
