
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  restaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  role: {
    type: String,
    enum: ['user', 'admin', 'manager', 'staff'],
    default: 'user'
  },
  permissions: [{
    type: String,
    enum: [
      'view_dashboard',
      'manage_tables',
      'manage_menu',
      'manage_orders',
      'manage_marketing',
      'manage_loyalty',
      'manage_settings',
      'manage_users'
    ]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if user has permission
UserSchema.methods.hasPermission = function(permission) {
  if (this.role === 'admin') return true; // Admin has all permissions
  return this.permissions.includes(permission);
};

module.exports = mongoose.model('User', UserSchema);
