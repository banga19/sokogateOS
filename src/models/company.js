const mongoose = require('mongoose');
const { Schema } = mongoose;

// Company model - represents African wholesalers, importers, exporters, procurement managers
const companySchema = new Schema({
  // Basic company information
  name: {
    type: String,
    required: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  taxId: {
    type: String,
    sparse: true
  },
  
  // Contact information
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phoneNumbers: [{
    type: String,
    trim: true
  }],
  whatsApp: {
    type: String,
    trim: true
  },
  
  // Address information
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { 
      type: String, 
      default: 'Nigeria' // Default to Nigeria but configurable for other African countries
    }
  },
  
  // Business details
  businessType: {
    type: String,
    enum: ['wholesaler', 'importer', 'exporter', 'procurement_manager', 'manufacturer', 'retailer'],
    required: true
  },
  primaryProducts: [{
    type: String,
    trim: true
  }],
  annualRevenue: {
    type: Number,
    min: 0
  },
  employeeCount: {
    type: Number,
    min: 0
  },
  
  // AI-Legibility fields (core to sokogateOS)
  legibilityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastLegibilityUpdate: {
    type: Date
  },
  communicationChannels: [{
    type: String,
    enum: ['email', 'whatsapp', 'sms', 'wechat', 'phone', 'erp', 'crm', 'document_upload'],
    default: []
  }],
  totalCommunicationsProcessed: {
    type: Number,
    default: 0
  },
  totalDocumentsProcessed: {
    type: Number,
    default: 0
  },
  
  // Preferences and settings
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    aiFeatures: {
      sourcing: { type: Boolean, default: true },
      customization: { type: Boolean, default: true },
      logistics: { type: Boolean, default: true },
      voiceInterface: { type: Boolean, default: true }
    }
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
companySchema.index({ name: 'text' });
companySchema.index({ businessType: 1, 'address.country': 1 });
companySchema.index({ legibilityScore: -1 });
companySchema.index({ 'communicationChannels': 1 });

// Virtual for full address
companySchema.virtual('fullAddress').get(function() {
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.postalCode,
    this.address.country
  ].filter(part => part);
  return parts.join(', ');
});

// Method to update legibility score
companySchema.methods.updateLegibilityScore = async function() {
  // Calculate legibility based on processed communications and documents
  const totalInteractions = this.totalCommunicationsProcessed + this.totalDocumentsProcessed;
  if (totalInteractions === 0) {
    this.legibilityScore = 0;
  } else {
    // Simple heuristic: more processed data = higher legibility score
    // In reality, this would be more sophisticated based on data quality, completeness, etc.
    this.legibilityScore = Math.min(100, Math.log10(totalInteractions + 1) * 25);
  }
  this.lastLegibilityUpdate = new Date();
  return this.legibilityScore;
};

module.exports = mongoose.model('Company', companySchema);
