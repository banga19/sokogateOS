const mongoose = require('mongoose');
const { Schema } = mongoose;

// Customization model - handles product customization, branding, and personalization
// This model tracks the full lifecycle of a customization request from design to production
const customizationSchema = new Schema({
  // References
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  sourcingRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'Sourcing',
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Request identification
  requestId: {
    type: String,
    unique: true,
    required: true
  },

  // Product base information
  productInfo: {
    name: String,
    description: String,
    category: String,
    subcategory: String,
    baseProductId: String, // Reference to the base product being customized
    hsCode: String, // Harmonized System code for customs
    images: [{
      url: String,
      type: { type: String, enum: ['design_reference', 'sample', 'final_product'] },
      description: String,
      uploadedAt: Date
    }]
  },

  // Customization specifications
  specifications: {
    // Branding
    branding: {
      logo: {
        placement: String, // e.g., 'front', 'back', 'left_sleeve', 'right_sleeve'
        method: { type: String, enum: ['embroidery', 'screen_print', 'heat_transfer', 'label', 'engrave', 'emboss'] },
        color: String,
        dimensions: {
          width: Number,
          height: Number,
          unit: { type: String, enum: ['cm', 'in', 'mm'], default: 'cm' }
        },
        fileName: String,
        fileUrl: String
      },
      label: {
        type: { type: String, enum: ['woven_label', 'printed_label', 'hang_tag', 'none'] },
        content: String,
        placement: String
      },
      packaging: {
        type: { type: String, enum: ['polybag', 'box', 'polybag_box', 'display_box', 'custom'] },
        color: String,
        branding: Boolean,
        innerPackaging: {
          type: String,
          enum: ['none', 'tissue_paper', 'bubble_wrap', 'kraft_paper']
        },
        outerPackaging: {
          type: String,
          enum: ['carton', 'crate', 'pallet_wrap']
        },
        quantityPerPackage: Number
      }
    },

    // Product modifications
    modifications: [{
      type: {
        type: String,
        enum: ['color', 'material', 'size', 'shape', 'feature_addition', 'feature_removal', 'finish', 'other']
      },
      originalValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
      specification: String,
      notes: String,
      costImpact: {
        amount: Number,
        currency: { type: String, default: 'USD' },
        type: { type: String, enum: ['per_unit', 'one_time'] }
      },
      timelineImpact: {
        additionalDays: Number,
        reason: String
      }
    }],

    // Quality requirements
    qualityRequirements: [{
      attribute: String,
      standard: { type: String, enum: ['min', 'max', 'exact', 'range', 'reference'] },
      value: Schema.Types.Mixed,
      unit: String,
      testingMethod: String,
      tolerance: String,
      isCritical: { type: Boolean, default: false }
    }],

    // Certifications needed for customized product
    certifications: [String], // e.g., ['CE', 'FDA', 'ISO9001', 'SGS']

    // Compliance notes
    compliance: {
      importRestrictions: [String],
      exportRestrictions: [String],
      restrictedMaterials: [String],
      notes: String
    }
  },

  // Design files and approvals
  design: {
    files: [{
      name: String,
      type: { type: String, enum: ['ai', 'eps', 'pdf', 'png', 'jpg', 'svg', 'dxf', 'stl'] },
      url: String,
      version: Number,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: Date,
      notes: String
    }],
    currentVersion: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'pending_approval', 'approved', 'rejected', 'revision_requested'],
      default: 'not_started'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    revisionNotes: String
  },

  // Material selection
  materials: [{
    name: String,
    type: { type: String, enum: ['fabric', 'plastic', 'metal', 'wood', 'paper', 'leather', 'chemical', 'electronic', 'other'] },
    specification: String,
    supplier: {
      name: String,
      supplierId: { type: Schema.Types.ObjectId, ref: 'Company' }
    },
    quantity: {
      value: Number,
      unit: String
    },
    unitCost: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    leadTime: Number, // in days
    moq: Number, // Minimum order quantity
    certifications: [String],
    color: String,
    finish: String,
    sustainabilityScore: { type: Number, min: 0, max: 100 },
    isSelected: { type: Boolean, default: false }
  }],

  // Quantity and pricing
  pricing: {
    quantity: {
      requested: {
        value: Number,
        unit: { type: String, enum: ['pieces', 'units', 'sets', 'kg', 'liters'], default: 'pieces' }
      },
      minimumOrder: {
        value: Number,
        unit: { type: String, enum: ['pieces', 'units', 'sets', 'kg', 'liters'], default: 'pieces' }
      }
    },
    costBreakdown: [{
      component: { type: String, enum: ['material', 'labor', 'tooling', 'setup', 'packaging', 'shipping', 'duty', 'tax', 'profit_margin', 'other'] },
      description: String,
      perUnit: {
        amount: Number,
        currency: { type: String, default: 'USD' }
      },
      total: {
        amount: Number,
        currency: { type: String, default: 'USD' }
      }
    }],
    totalCost: {
      perUnit: {
        amount: Number,
        currency: { type: String, default: 'USD' }
      },
      total: {
        amount: Number,
        currency: { type: String, default: 'USD' }
      }
    },
    targetPrice: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    margin: {
      percentage: Number,
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    paymentTerms: {
      type: String,
      enum: ['deposit_balance', 'letter_of_credit', 'net30', 'net60', 'advance', 'cod'],
      default: 'deposit_balance'
    },
    depositPercentage: { type: Number, min: 0, max: 100, default: 50 },
    validUntil: Date,
    currency: { type: String, default: 'USD' }
  },

  // Production timeline
  productionTimeline: {
    designPhase: {
      startDate: Date,
      endDate: Date,
      durationDays: Number
    },
    samplingPhase: {
      startDate: Date,
      endDate: Date,
      durationDays: Number,
      sampleRequested: Boolean,
      sampleApproved: Date
    },
    productionPhase: {
      startDate: Date,
      endDate: Date,
      durationDays: Number,
      estimatedCompletion: Date,
      actualCompletion: Date
    },
    totalEstimatedDays: Number,
    bufferDays: Number,
    urgency: { type: String, enum: ['standard', 'expedited', 'rush'], default: 'standard' }
  },

  // Sampling
  sampling: {
    required: { type: Boolean, default: true },
    status: { type: String, enum: ['not_requested', 'in_production', 'shipped', 'received', 'approved', 'rejected'], default: 'not_requested' },
    samples: [{
      sampleId: String,
      type: { type: String, enum: ['proto', 'lab_dip', 'strike_off', 'pre_production', 'shipment'] },
      status: String,
      trackingNumber: String,
      shippedAt: Date,
      receivedAt: Date,
      approvedAt: Date,
      notes: String,
      images: [{ url: String, description: String }]
    }]
  },

  // Quality control
  qualityControl: {
    status: { type: String, enum: ['pending', 'in_progress', 'passed', 'failed', 'conditional_pass'] },
    inspector: String,
    inspectionDate: Date,
    reportUrl: String,
    checks: [{
      checkName: String,
      standard: String,
      result: { type: String, enum: ['pass', 'fail', 'na'] },
      measuredValue: String,
      tolerance: String,
      notes: String
    }],
    defects: [{
      type: String,
      severity: { type: String, enum: ['minor', 'major', 'critical'] },
      description: String,
      count: Number,
      action: String
    }],
    aqlLevel: String, // Acceptable Quality Limit
    samplingPlan: String
  },

  // Workflow tracking
  workflow: {
    status: {
      type: String,
      enum: [
        'draft',
        'briefing',
        'design_review',
        'specification',
        'material_selection',
        'pricing',
        'sampling',
        'production',
        'quality_check',
        'completed',
        'cancelled',
        'on_hold'
      ],
      default: 'draft'
    },
    currentStep: String,
    stepsCompleted: [String],
    stepTimestamps: {
      drafted: Date,
      briefed: Date,
      designReviewed: Date,
      specified: Date,
      materialSelected: Date,
      priced: Date,
      sampleStarted: Date,
      productionStarted: Date,
      qualityChecked: Date,
      completed: Date
    },
    automationLevel: {
      type: String,
      enum: ['manual', 'semi_automated', 'fully_automated'],
      default: 'semi_automated'
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' }
  },

  // Communication history
  communications: [{
    type: { type: String, enum: ['email', 'whatsapp', 'note', 'call', 'meeting'] },
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    subject: String,
    content: String,
    attachments: [{ fileName: String, url: String }],
    timestamp: { type: Date, default: Date.now }
  }],

  // User interactions (for self-improving loops)
  userInteractions: [{
    action: { type: String, enum: ['viewed', 'liked', 'disliked', 'modified', 'shared', 'approved', 'rejected', 'commented'] },
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    details: Schema.Types.Mixed,
    sessionId: String
  }],

  // Outcome and satisfaction
  outcome: {
    finalQuantity: {
      value: Number,
      unit: { type: String, enum: ['pieces', 'units', 'sets', 'kg', 'liters'] }
    },
    finalCost: {
      perUnit: { amount: Number, currency: { type: String, default: 'USD' } },
      total: { amount: Number, currency: { type: String, default: 'USD' } }
    },
    deliveryDate: Date,
    satisfactionScore: { type: Number, min: 1, max: 5 },
    lessonsLearned: [String],
    repeatOrder: Boolean
  },

  // Metadata
  source: {
    type: String,
    enum: ['api', 'web', 'mobile', 'whatsapp', 'email', 'voice'],
    default: 'api'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isActive: { type: Boolean, default: true },
  expiresAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
customizationSchema.index({ companyId: 1, 'workflow.status': 1 });
customizationSchema.index({ companyId: 1, createdAt: -1 });
customizationSchema.index({ requestId: 1 });
customizationSchema.index({ sourcingRequestId: 1 });
customizationSchema.index({ 'design.status': 1 });
customizationSchema.index({ 'pricing.totalCost.total.amount': 1 });

// Virtual for total processing time
customizationSchema.virtual('processingTime').get(function() {
  if (!this.workflow.stepTimestamps.briefed || !this.workflow.stepTimestamps.completed) {
    return null;
  }
  return this.workflow.stepTimestamps.completed - this.workflow.stepTimestamps.briefed;
});

// Method to calculate AI confidence for pricing estimation
customizationSchema.methods.calculatePricingConfidence = function() {
  const hasSpecs = this.specifications && Object.keys(this.specifications).length > 0;
  const hasDesign = this.design.status === 'approved';
  const hasMaterials = this.materials.some(m => m.isSelected);
  const hasSample = this.sampling.required ? this.sampling.status === 'approved' : true;

  let confidence = 0;
  if (hasSpecs) confidence += 0.25;
  if (hasDesign) confidence += 0.25;
  if (hasMaterials) confidence += 0.25;
  if (hasSample) confidence += 0.25;

  return confidence;
};

// Static method to get customization analytics for a company
customizationSchema.statics.getCompanyAnalytics = async function(companyId, options = {}) {
  const match = { companyId };
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
          { $match: { 'workflow.status': 'completed' } },
          { $group: { _id: null, totalCustomizations: { $sum: 1 } } }
        ],
        status: [
          { $group: { _id: '$workflow.status', count: { $sum: 1 } } }
        ],
        satisfaction: [
          { $match: { 'outcome.satisfactionScore': { $exists: true, $ne: null } } },
          { $group: { _id: null, avgScore: { $avg: '$outcome.satisfactionScore' }, total: { $sum: 1 } } }
        ]
      }
    }
  ]);

  return analytics[0] || {};
};

module.exports = mongoose.model('Customization', customizationSchema);
