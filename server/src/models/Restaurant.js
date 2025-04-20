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
RestaurantSchema.pre('remove', async function(next) {
  await this.model('MenuItem').deleteMany({ restaurant: this._id });
  await this.model('Table').deleteMany({ restaurant: this._id });
  await this.model('Order').deleteMany({ restaurant: this._id });
  next();
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
