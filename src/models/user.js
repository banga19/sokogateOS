const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

// User model - represents all platform users with role-based access control
const userSchema = new Schema({
  // Basic information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Never return password by default
  },
  phone: {
    type: String,
    trim: true
  },
  whatsApp: {
    type: String,
    trim: true
  },

  // Company association
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },

  // Role-based access control
  role: {
    type: String,
    enum: [
      'super_admin',        // Full system access
      'company_admin',      // Admin within their company
      'procurement_manager', // Product sourcing & supplier management
      'logistics_coordinator', // Shipment tracking & logistics
      'sales_team',         // Product customization & client management
      'executive',          // Dashboard-only read access
      'finance'             // Pricing, payments, financial data
    ],
    default: 'procurement_manager',
    required: true
  },

  // Fine-grained permissions (overrides role defaults)
  permissions: {
    sourcing: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      approve: { type: Boolean, default: false }
    },
    customization: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      approve: { type: Boolean, default: false }
    },
    logistics: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      track: { type: Boolean, default: true }
    },
    analytics: {
      view: { type: Boolean, default: true },
      export: { type: Boolean, default: false }
    },
    admin: {
      manageUsers: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
      manageBilling: { type: Boolean, default: false }
    }
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // Terms & Conditions acceptance (Polsia-style consent layer)
  termsAccepted: {
    type: Boolean,
    default: false
  },
  termsAcceptedAt: {
    type: Date
  },
  termsVersion: {
    type: String,
    default: '1.0'
  },

  lastLoginAt: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'fr', 'sw', 'ha', 'yo', 'ig', 'ar'],
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    timezone: {
      type: String,
      default: 'Africa/Nairobi'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    }
  },
  // Personalization insights from Hermes agent based on onboarding data
  personalization: {
    insights: [{ type: Schema.Types.Mixed }],
    recommendations: [{ type: Schema.Types.Mixed }],
    personalizationProfile: {
      interface: { type: Schema.Types.Mixed },
      notifications: { type: Schema.Types.Mixed },
      language: { type: String },
      timezone: { type: String },
      theme: { type: String }
    },
    lastUpdated: { type: Date },
    version: { type: String, default: '1.0' }
  },

  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after a given timestamp
userSchema.methods.isPasswordChangedAfter = function(jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Check if user has a specific permission
userSchema.methods.hasPermission = function(domain, action) {
  if (this.role === 'super_admin') return true;

  // Check role-based defaults first
  const rolePermissions = {
    company_admin: {
      sourcing: { approve: true },
      customization: { approve: true },
      analytics: { export: true },
      admin: { manageUsers: true, manageSettings: true }
    },
    procurement_manager: {
      sourcing: { approve: false },
      analytics: { export: false },
      admin: { manageUsers: false, manageSettings: false, manageBilling: false }
    },
    logistics_coordinator: {
      sourcing: { create: false, approve: false },
      customization: { create: false, approve: false },
      analytics: { export: false },
      admin: { manageUsers: false, manageSettings: false, manageBilling: false }
    },
    sales_team: {
      sourcing: { create: false, approve: false },
      logistics: { create: false, update: false },
      analytics: { export: false },
      admin: { manageUsers: false, manageSettings: false, manageBilling: false }
    },
    executive: {
      sourcing: { create: false, update: false, approve: false },
      customization: { create: false, update: false, approve: false },
      logistics: { create: false, update: false },
      admin: { manageUsers: false, manageSettings: false, manageBilling: false }
    },
    finance: {
      sourcing: { create: false, update: false, approve: false },
      customization: { create: false, update: false, approve: false },
      logistics: { create: false, update: false },
      admin: { manageUsers: false, manageSettings: false, manageBilling: false }
    }
  };

  // Merge role defaults with explicit permissions
  const perms = this.permissions[domain];
  if (!perms) return false;

  // Check if role default grants this
  const roleDefault = rolePermissions[this.role]?.[domain]?.[action];
  if (roleDefault === true) return true;

  return perms[action] === true;
};

// Static method to get users by role
userSchema.statics.findByRole = function(role, companyId) {
  const query = { role };
  if (companyId) query.companyId = companyId;
  return this.find(query).select('-password');
};

// Static method to get active users in a company
userSchema.statics.findActiveByCompany = function(companyId) {
  return this.find({ companyId, isActive: true }).select('-password');
};

module.exports = mongoose.model('User', userSchema);
