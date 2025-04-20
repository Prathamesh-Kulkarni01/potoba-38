const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager', 'staff'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  restaurants: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    default: []
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get JWT payload data
userSchema.methods.getJwtPayload = function() {
  return {
    userId: this._id,
    email: this.email,
    role: this.role,
    name: this.name
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
