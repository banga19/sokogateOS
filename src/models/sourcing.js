const mongoose = require('mongoose');
const { Schema } = mongoose;

// Sourcing service model - AI-powered bulk products sourcing
// This implements the AI capabilities for making sourcing data-driven and predictive
const sourcingSchema = new Schema({
  // Reference to the company using this sourcing request
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Reference to the artifact that triggered this sourcing request (if any)
  artifactId: {
    type: Schema.Types.ObjectId,
    ref: 'Artifact',
    index: true
  },
  
  // Sourcing request details
  requestId: {
    type: String,
    unique: true,
    required: true
  },
  
  // What is being sought
  productQuery: {
    original: {           // Original request as received
      type: String,
      required: true
    },
    processed: {          // Cleaned/normalized version
      type: String
    },
    structured: {         // AI-extracted structured query
      category: String,   // Product category
      subcategory: String,
      brand: String,
      model: String,
      specifications: [{
        name: String,
        value: Schema.Types.Mixed,
        unit: String
      }],
      quantity: {
        value: Number,
        unit: { type: String, enum: ['pieces', 'kg', 'grams', 'liters', 'meters', 'square_meters', 'cubic_meters', 'tons'] },
        type: { type: String, enum: ['exact', 'minimum', 'maximum', 'approximate'] }
      },
      qualityRequirements: [{
        attribute: String,
        requirement: { type: String, enum: ['min', 'max', 'exact', 'range'] },
        value: Schema.Types.Mixed,
        unit: String
      }],
      packaging: String,
      certifications: [String], // e.g., ['ISO9001', 'CE', 'FDA']
      targetPrice: {
        amount: Number,
        currency: { type: String, default: 'USD' },
        type: { type: String, enum: ['target', 'maximum', 'budget'] }
      },
      deliveryTimeline: {
        earliest: Date,
        latest: Date,
        flexible: { type: Boolean, default: false }
      },
      incoterms: { type: String, enum: ['EXW', 'FOB', 'CIF', 'DDP', 'DAP'] },
      paymentTerms: { type: String, enum: ['Net30', 'Net60', 'LC', 'Advance', 'Partial'] }
    }
  },
  
  // AI-powered supplier discovery and matching
  supplierMatches: [{
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Company' // Assuming suppliers are also companies in our system
    },
    supplierName: String,
    matchScore: { type: Number, min: 0, max: 1 }, // How well supplier matches requirements
    matchReasons: [{ type: String }], // Why this supplier was matched
    
    // Capability matching (from AI analysis of supplier's historical communications)
    capabilityMatch: {
      productMatch: { type: Number, min: 0, max: 1 }, // Does supplier offer this product?
      quantityMatch: { type: Number, min: 0, max: 1 }, // Can supplier handle required quantity?
      qualityMatch: { type: Number, min: 0, max: 1 }, // Does supplier meet quality requirements?
      timelineMatch: { type: Number, min: 0, max: 1 }, // Can supplier meet delivery timeline?
      priceCompetitiveness: { type: Number, min: 0, max: 1 } // How competitive are prices?
    },
    
    // Historical performance data (from AI legibility layer)
    historicalPerformance: {
      totalTransactions: Number,
      avgResponseTimeHours: Number,
      onTimeDeliveryRate: { type: Number, min: 0, max: 1 },
      qualitySuccessRate: { type: Number, min: 0, max: 1 },
      communicationEffectiveness: { type: Number, min: 0, max: 1 },
      priceStability: { type: Number, min: 0, max: 1 } // How stable are prices over time
    },
    
    // AI-generated quote
    quote: {
      price: {
        amount: Number,
        currency: { type: String, default: 'USD' },
        breakdown: [{
          component: String, // e.g., 'product', 'shipping', 'taxes', 'duties'
          amount: Number,
          currency: { type: String, default: 'USD' }
        }],
        validUntil: Date,
        terms: [String] // e.g., ['EXW Lagos', 'MOQ 100 units']
      },
      leadTime: {
        processingDays: Number,
        transitDays: Number,
        totalDays: Number
      },
      minimumOrderQuantity: {
        value: Number,
        unit: { type: String, enum: ['pieces', 'kg', 'grams', 'liters', 'meters', 'square_meters', 'cubic_meters', 'tons'] }
      },
      paymentTerms: { type: String, enum: ['Net30', 'Net60', 'LC', 'Advance', 'Partial'] },
      incoterms: { type: String, enum: ['EXW', 'FOB', 'CIF', 'DDP', 'DAP'] },
      confidence: { type: Number, min: 0, max: 1 } // AI confidence in quote accuracy
    },
    
    // Risk assessment (from AI analysis of supplier communications)
    riskAssessment: {
      overallRiskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      riskScore: { type: Number, min: 0, max: 100 },
      riskFactors: [{
        type: { type: String, enum: ['financial', 'operational', 'compliance', 'geopolitical', 'quality', 'delivery'] },
        level: { type: String, enum: ['low', 'medium', 'high'] },
        description: String,
        mitigation: String
      }],
      earlyWarningSigns: [String] // From communication pattern analysis
    }
  }],
  
  // AI-powered demand prediction and market intelligence
  marketIntelligence: {
    demandPrediction: {
      predictedDemand: {
        value: Number,
        unit: { type: String, enum: ['pieces', 'kg', 'grams', 'liters', 'meters', 'square_meters', 'cubic_meters', 'tons'] },
        confidence: { type: Number, min: 0, max: 1 },
        timeframe: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'] }
      },
      trend: { type: String, enum: ['increasing', 'decreasing', 'stable', 'volatile'] },
      seasonality: {
        isSeasonal: Boolean,
        peakMonths: [Number], // 0-11 for Jan-Dec
        lowMonths: [Number]
      }
    },
    priceIntelligence: {
      marketAveragePrice: {
        amount: Number,
        currency: { type: String, default: 'USD' }
      },
      priceRange: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'USD' }
      },
      priceTrend: { type: String, enum: ['increasing', 'decreasing', 'stable'] },
      volatility: { type: Number, min: 0, max: 1 }, // Price volatility index
      lastUpdated: Date
    },
    supplierLandscape: {
      totalSuppliersIdentified: Number,
      activeSuppliers: Number,
      newSuppliersThisPeriod: Number,
      supplierConcentration: { type: Number, min: 0, max: 1 }, // Herfindahl index
      geographicDistribution: [{
        region: String,
        supplierCount: Number,
        avgPrice: Number
      }]
    }
  },
  
  // Workflow automation tracking
  workflow: {
    status: {
      type: String,
      enum: ['draft', 'submitted', 'matching', 'quoting', 'negotiating', 'approved', 'rejected', 'expired', 'completed'],
      default: 'draft'
    },
    currentStep: String,
    stepsCompleted: [{ type: String }],
    stepTimestamps: {
      submitted: Date,
      matchingStarted: Date,
      matchingCompleted: Date,
      quotingStarted: Date,
      quotingCompleted: Date,
      negotiationStarted: Date,
      negotiationCompleted: Date,
      approvalDate: Date,
      completionDate: Date
    },
    automationLevel: { // How much of the process was automated
      type: String,
      enum: ['manual', 'semi-automated', 'fully-automated'],
      default: 'manual'
    }
  },
  
  // User interactions and feedback (for self-improving loops)
  userInteractions: [{
    action: { type: String, enum: ['viewed', 'liked', 'disliked', 'modified', 'shared', 'downloaded'] },
    timestamp: { type: Date, default: Date.now },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    details: Schema.Types.Mixed,
    sessionId: String // For tracking user session
  }],
  
  // Final outcome
  outcome: {
    selectedSupplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Company'
    },
    selectedSupplierName: String,
    finalPrice: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    finalQuantity: {
      value: Number,
      unit: { type: String, enum: ['pieces', 'kg', 'grams', 'liters', 'meters', 'square_meters', 'cubic_meters', 'tons'] }
    },
    agreementDate: Date,
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    status: { type: String, enum: ['pending', 'in_transit', 'delivered', 'cancelled', 'disputed'] },
    satisfactionScore: { type: Number, min: 1, max: 5 }, // User satisfaction 1-5
    lessonsLearned: [String] // For continuous improvement
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: Date, // When this sourcing request expires
  isActive: { type: Boolean, default: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  source: { // How this request originated
    type: String,
    enum: ['api', 'web', 'mobile', 'whatsapp', 'email', 'voice', 'ussd', 'erp_integration'],
    default: 'api'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
sourcingSchema.index({ companyId: 1 });
sourcingSchema.index({ artifactId: 1 });
sourcingSchema.index({ requestId: 1 });
sourcingSchema.index({ 'workflow.status': 1 });
sourcingSchema.index({ 'workflow.status': 1, 'createdAt': -1 });
sourcingSchema.index({ 'productQuery.original': 'text' });
sourcingSchema.index({ 'supplierMatches.supplierId': 1 });
sourcingSchema.index({ 'marketIntelligence.demandPrediction.predictedDemand.value': 1 });
sourcingSchema.index({ outcome: 1 });
sourcingSchema.index({ createdAt: -1 });
sourcingSchema.index({ expiresAt: 1 });

// Virtual for processing time
sourcingSchema.virtual('processingTime').get(function() {
  if (!this.workflow.stepTimestamps.submitted || !this.workflow.stepTimestamps.completionDate) {
    return null;
  }
  return this.workflow.stepTimestamps.completionDate - this.workflow.stepTimestamps.submitted;
});

// Method to calculate AI confidence score for the sourcing request
sourcingSchema.methods.calculateAIConfidence = function() {
  // This would be a sophisticated algorithm based on:
  // - Quality of extracted product query
  // - Number and quality of supplier matches
  // - Market intelligence confidence
  // - Historical accuracy of similar predictions
  
  // Simplified version for now
  const queryConfidence = this.productQuery.structured ? 0.8 : 0.3; // Has structured data
  const matchConfidence = this.supplierMatches.length > 0 ? 
    Math.min(1, this.supplierMatches.reduce((sum, match) => sum + (match.matchScore || 0), 0) / this.supplierMatches.length) : 0;
  const marketConfidence = this.marketIntelligence.demandPrediction.predictedDemand.confidence || 0.5;
  
  return (queryConfidence + matchConfidence + marketConfidence) / 3;
};

// Static method to get sourcing analytics for a company
sourcingSchema.statics.getCompanyAnalytics = async function(companyId, options = {}) {
  const match = { companyId: new mongoose.Types.ObjectId(companyId) };
  if (options.startDate) {
    match.createdAt = { $gte: options.startDate };
  }
  if (options.endDate) {
    if (!match.createdAt) match.createdAt = {};
    match.createdAt.$lte = options.endDate;
  }
  
  const analytics = await this.aggregate([
    { $match: match },
    {
      $facet: {
        volume: [
          { $match: { 'outcome.status': 'delivered' } },
          { $group: { _id: null, totalOrders: { $sum: 1 }, totalQuantity: { $sum: '$outcome.finalQuantity.value' } } }
        ],
        performance: [
          { $group: { 
            _id: '$workflow.status',
            count: { $sum: 1 },
            avgProcessingTime: { $avg: { $divide: [{ $subtract: ['$workflow.stepTimestamps.completionDate', '$workflow.stepTimestamps.submitted'] }, 86400000] } } // in days
          }}
        ],
        satisfaction: [
          { $match: { 'outcome.satisfactionScore': { $exists: true, $ne: null } } },
          { $group: { _id: null, avgSatisfaction: { $avg: '$outcome.satisfactionScore' }, totalRated: { $sum: 1 } } }
        ]
      }
    }
  ]);
  
  return analytics[0] || {};
};

module.exports = mongoose.model('Sourcing', sourcingSchema);
