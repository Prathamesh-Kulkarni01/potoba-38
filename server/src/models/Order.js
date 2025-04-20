
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  },
  name: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    default: 1
  }
});

const OrderSchema = new mongoose.Schema({
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'completed', 'cancelled'],
    default: 'new'
  },
  items: [OrderItemSchema],
  total: {
    type: Number,
    required: true
  },
  customerName: String,
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

module.exports = mongoose.model('Order', OrderSchema);
