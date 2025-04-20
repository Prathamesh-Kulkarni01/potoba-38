
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');

// @desc    Get all orders for a restaurant
// @route   GET /api/restaurants/:restaurantId/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this restaurant'
      });
    }

    const orders = await Order.find({ restaurant: req.params.restaurantId }).populate('table');

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/restaurants/:restaurantId/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('table');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const restaurant = await Restaurant.findById(order.restaurant);

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new order
// @route   POST /api/restaurants/:restaurantId/tables/:tableId/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    // Add restaurant and table to req.body
    req.body.restaurant = req.params.restaurantId;
    req.body.table = req.params.tableId;

    const restaurant = await Restaurant.findById(req.params.restaurantId);
    const table = await Table.findById(req.params.tableId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Make sure user owns the restaurant or it's a customer order
    if (req.user && restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to create orders for this restaurant'
      });
    }

    // Set table status to occupied
    await Table.findByIdAndUpdate(req.params.tableId, { status: 'occupied' });

    const order = await Order.create(req.body);

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update order
// @route   PUT /api/restaurants/:restaurantId/orders/:id
// @access  Private
exports.updateOrder = async (req, res) => {
  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const restaurant = await Restaurant.findById(req.params.restaurantId);

    // Make sure restaurant exists
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update orders for this restaurant'
      });
    }

    order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update order status
// @route   PATCH /api/restaurants/:restaurantId/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const restaurant = await Restaurant.findById(req.params.restaurantId);

    // Make sure restaurant exists
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update orders for this restaurant'
      });
    }

    // Update status
    order.status = req.body.status;

    // If completed, set completedAt
    if (req.body.status === 'completed') {
      order.completedAt = Date.now();
      
      // If order is completed, also update table status to available if needed
      await Table.findByIdAndUpdate(order.table, { status: 'available' });
    }

    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/restaurants/:restaurantId/orders/:id
// @access  Private
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const restaurant = await Restaurant.findById(req.params.restaurantId);

    // Make sure restaurant exists
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Make sure user owns the restaurant
    if (restaurant.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete orders from this restaurant'
      });
    }

    await order.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
