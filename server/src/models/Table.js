
const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: [true, 'Please add a table number']
  },
  capacity: {
    type: Number,
    required: [true, 'Please add table capacity']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved'],
    default: 'available'
  },
  qrCode: String,
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Table', TableSchema);
