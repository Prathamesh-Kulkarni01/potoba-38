
const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  logo: String,
  address: String,
  phone: String,
  cuisine: String,
  tables: Number,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Cascade delete menu items, tables, and orders when a restaurant is deleted
RestaurantSchema.pre('deleteOne', { document: true }, async function(next) {
  console.log(`Deleting associated data for restaurant ${this._id}`);
  try {
    const MenuItem = mongoose.model('MenuItem');
    const Table = mongoose.model('Table');
    const Order = mongoose.model('Order');
    
    await MenuItem.deleteMany({ restaurant: this._id });
    await Table.deleteMany({ restaurant: this._id });
    await Order.deleteMany({ restaurant: this._id });
    next();
  } catch (err) {
    console.error('Error in cascade delete:', err);
    next(err);
  }
});

// Reverse populate with virtuals
RestaurantSchema.virtual('menuItems', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false
});

RestaurantSchema.virtual('virtualTables', {
  ref: 'Table',
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false
});

RestaurantSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
