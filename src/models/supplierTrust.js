const mongoose = require('mongoose');
const { Schema } = mongoose;

// Supplier Trust model — trust scores, verification status, escrow payments
const supplierTrustSchema = new Schema({
  // Supplier company reference (supports human-readable IDs for seed data)
  supplierId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  supplierName: {
    type: String,
    required: true
  },

  // Trust score (0-100)
  trustScore: {
    overall: { type: Number, default: 0, min: 0, max: 100 },
    deliveryReliability: { type: Number, default: 0, min: 0, max: 100 },
    qualityConsistency: { type: Number, default: 0, min: 0, max: 100 },
    communicationEffectiveness: { type: Number, default: 0, min: 0, max: 100 },
    pricingFairness: { type: Number, default: 0, min: 0, max: 100 },
    disputeResolution: { type: Number, default: 0, min: 0, max: 100 },
    lastCalculated: { type: Date, default: Date.now }
  },

  // Verification status
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'in_progress', 'verified', 'suspended'],
      default: 'unverified'
    },
    level: {
      type: String,
      enum: ['basic', 'documented', 'audited', 'certified'],
      default: 'basic'
    },
    documents: [{
      type: { type: String, enum: ['business_license', 'tax_id', 'certification', 'insurance', 'audit_report'] },
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
      url: String,
      uploadedAt: { type: Date, default: Date.now },
      verifiedAt: Date,
      notes: String
    }],
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    expiresAt: Date
  },

  // Business profile (public-facing)
  publicProfile: {
    headline: String,
    description: String,
    foundedYear: Number,
    employeeCount: Number,
    annualRevenue: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' }
    },
    country: String,
    city: String,
    categories: [String],
    certifications: [String],
    languages: [String],
    incoterms: [String],
    paymentTerms: [String],
    minOrderValue: { amount: Number, currency: { type: String, default: 'USD' } },
    leadTimeDays: { min: Number, max: Number },
    logo: String,
    coverImage: String,
    socialLinks: {
      website: String,
      linkedin: String,
      alibaba: String
    }
  },

  // Transaction history summary
  transactionSummary: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    disputedOrders: { type: Number, default: 0 },
    totalValue: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' }
    },
    avgResponseTimeHours: { type: Number, default: 0 },
    avgDeliveryDays: { type: Number, default: 0 },
    onTimeDeliveryRate: { type: Number, default: 0, min: 0, max: 1 },
    qualitySuccessRate: { type: Number, default: 0, min: 0, max: 1 },
    lastTransactionDate: Date
  },

  // Reviews from buyers
  reviews: [{
    buyerId: { type: Schema.Types.ObjectId, ref: 'Company' },
    buyerName: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String,
    comment: String,
    categories: {
      quality: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      delivery: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 }
    },
    orderId: String,
    isVerifiedPurchase: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    responseFromSupplier: {
      comment: String,
      createdAt: Date
    }
  }],

  // Subscription tier
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'basic', 'verified', 'premium'],
      default: 'free'
    },
    startedAt: Date,
    expiresAt: Date,
    autoRenew: { type: Boolean, default: false },
    monthlyFee: { amount: Number, currency: { type: String, default: 'USD' } }
  },

  // Escrow account
  escrowBalance: {
    available: { type: Number, default: 0 },
    held: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    lastUpdated: { type: Date, default: Date.now }
  },

  // Metadata
  isActive: { type: Boolean, default: true },
  lastApifyEnrichment: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
supplierTrustSchema.index({ trustScore: -1 });
supplierTrustSchema.index({ 'verification.status': 1, trustScore: -1 });
supplierTrustSchema.index({ 'publicProfile.country': 1, 'publicProfile.categories': 1 });
supplierTrustSchema.index({ 'subscription.tier': 1 });
supplierTrustSchema.index({ 'publicProfile.certifications': 1 });

// Text index for supplier search
supplierTrustSchema.index({
  supplierName: 'text',
  'publicProfile.headline': 'text',
  'publicProfile.description': 'text',
  'publicProfile.country': 'text',
  'publicProfile.city': 'text'
});

// Virtual: average review rating
supplierTrustSchema.virtual('averageRating').get(function() {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

// Virtual: review count
supplierTrustSchema.virtual('reviewCount').get(function() {
  return this.reviews ? this.reviews.length : 0;
});

// Method: calculate overall trust score
supplierTrustSchema.methods.calculateTrustScore = function() {
  const deliveryW = 0.25;
  const qualityW = 0.25;
  const commsW = 0.15;
  const pricingW = 0.15;
  const disputeW = 0.1;
  const verificationW = 0.1;

  // Base from transaction data
  const deliveryScore = this.transactionSummary.onTimeDeliveryRate * 100;
  const qualityScore = this.transactionSummary.qualitySuccessRate * 100;
  const commsScore = Math.min(100, 100 - (this.transactionSummary.avgResponseTimeHours * 2));
  const pricingScore = this.reviews.length > 0
    ? (this.reviews.reduce((s, r) => s + (r.categories?.value || 3), 0) / this.reviews.length) * 20
    : 50;

  const disputeRatio = this.transactionSummary.totalOrders > 0
    ? this.transactionSummary.disputedOrders / this.transactionSummary.totalOrders
    : 1;
  const disputeScore = (1 - disputeRatio) * 100;

  // Verification bonus
  const verificationBonuses = {
    unverified: 0,
    pending: 10,
    in_progress: 20,
    verified: 30,
    suspended: 0
  };
  const verificationBonus = verificationBonuses[this.verification.status] || 0;

  const overall = (deliveryScore * deliveryW) +
                  (qualityScore * qualityW) +
                  (commsScore * commsW) +
                  (pricingScore * pricingW) +
                  (disputeScore * disputeW) +
                  (verificationBonus * verificationW);

  this.trustScore.overall = Math.round(Math.min(100, Math.max(0, overall)));
  this.trustScore.deliveryReliability = Math.round(deliveryScore);
  this.trustScore.qualityConsistency = Math.round(qualityScore);
  this.trustScore.communicationEffectiveness = Math.round(commsScore);
  this.trustScore.pricingFairness = Math.round(pricingScore);
  this.trustScore.disputeResolution = Math.round(disputeScore);
  this.trustScore.lastCalculated = new Date();

  return this.trustScore;
};

// Static: Find top suppliers by trust score
supplierTrustSchema.statics.findTopSuppliers = function(criteria = {}, limit = 10) {
  const query = {
    isActive: true,
    'verification.status': { $ne: 'suspended' },
    ...criteria
  };
  return this.find(query)
    .sort({ 'trustScore.overall': -1 })
    .limit(limit)
    .select('supplierName trustScore publicProfile verification.status reviews transactionSummary');
};

module.exports = mongoose.model('SupplierTrust', supplierTrustSchema);
