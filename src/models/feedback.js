const mongoose = require('mongoose');
const { Schema } = mongoose;

// Feedback model - core to the self-improving loop
// Captures explicit and implicit feedback from users to continuously improve AI models
const feedbackSchema = new Schema({
  // References
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },

  // What this feedback is about (polymorphic reference)
  target: {
    type: {
      type: String,
      enum: [
        'sourcing_request',     // Feedback on a sourcing request
        'supplier_match',       // Feedback on a supplier match
        'product_recommendation', // Feedback on product recommendations
        'customization_design',  // Feedback on customization design
        'logistics_eta',        // Feedback on delivery ETA
        'pricing_estimate',     // Feedback on pricing
        'document_extraction',  // Feedback on AI document extraction
        'market_intelligence',  // Feedback on market data
        'route_optimization',   // Feedback on logistics route
        'general'               // General platform feedback
      ],
      required: true
    },
    id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    field: String, // Specific field being rated (for AI extraction corrections)
    originalValue: Schema.Types.Mixed, // What the AI originally produced
    correctedValue: Schema.Types.Mixed // What the user corrected it to
  },

  // Explicit feedback (user actively provides)
  explicit: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    tags: [String],
    comments: String,
    category: {
      type: String,
      enum: ['accuracy', 'relevance', 'timeliness', 'usability', 'quality', 'other']
    }
  },

  // Implicit feedback (inferred from user behavior)
  implicit: {
    action: {
      type: String,
      enum: [
        'accepted',     // User accepted AI suggestion
        'rejected',     // User rejected AI suggestion
        'modified',     // User modified AI output
        'ignored',      // User ignored AI suggestion
        'viewed',       // User viewed the result
        'clicked',      // User clicked on a recommendation
        'dwelled',      // User spent time on a result
        'shared',       // User shared with others
        'downloaded',   // User downloaded the result
        'converted',    // User took desired action (e.g., placed order)
        'abandoned'     // User abandoned the process
      ]
    },
    context: {
      page: String,
      section: String,
      timeSpent: Number, // milliseconds
      scrollDepth: Number, // percentage
      deviceType: String
    },
    value: Schema.Types.Mixed // Additional context about the action
  },

  // Feedback type classification
  type: {
    type: String,
    enum: ['explicit', 'implicit'],
    required: true
  },

  // Effectiveness metrics (how this feedback improved the system)
  effectiveness: {
    modelImproved: { type: Boolean, default: false },
    accuracyGain: { type: Number, min: 0, max: 1 },
    appliedAt: Date,
    retrainingTriggered: { type: Boolean, default: false },
    improvementNotes: String
  },

  // Metadata
  source: {
    type: String,
    enum: ['api', 'web', 'mobile', 'whatsapp', 'email', 'system'],
    default: 'api'
  },
  ipAddress: String,
  userAgent: String,
  isProcessed: {
    type: Boolean,
    default: false
  },
  processedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying and analytics
feedbackSchema.index({ companyId: 1, createdAt: -1 });
feedbackSchema.index({ companyId: 1, 'target.type': 1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ 'explicit.rating': 1 });
feedbackSchema.index({ 'target.id': 1, 'target.type': 1 });
feedbackSchema.index({ isProcessed: 1 });
feedbackSchema.index({ type: 1 });

// Virtual for feedback age
feedbackSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Method to mark feedback as processed
feedbackSchema.methods.markAsProcessed = function() {
  this.isProcessed = true;
  this.processedAt = new Date();
  return this.save();
};

// Static method to get feedback analytics for a company
feedbackSchema.statics.getCompanyAnalytics = async function(companyId, options = {}) {
  const match = { companyId };
  if (options.startDate) match.createdAt = { $gte: options.startDate };
  if (options.endDate) {
    if (!match.createdAt) match.createdAt = {};
    match.createdAt.$lte = options.endDate;
  }
  if (options.targetType) match['target.type'] = options.targetType;

  const analytics = await this.aggregate([
    { $match: match },
    {
      $facet: {
        volume: [
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ],
        ratings: [
          { $match: { 'explicit.rating': { $exists: true } } },
          { $group: {
            _id: null,
            avgRating: { $avg: '$explicit.rating' },
            total: { $sum: 1 },
            distribution: {
              $push: '$explicit.rating'
            }
          }}
        ],
        targets: [
          { $group: { _id: '$target.type', count: { $sum: 1 }, avgRating: { $avg: '$explicit.rating' } } }
        ],
        processingRate: [
          { $group: {
            _id: null,
            total: { $sum: 1 },
            processed: { $sum: { $cond: ['$isProcessed', 1, 0] } }
          }}
        ]
      }
    }
  ]);

  return analytics[0] || {};
};

// Static method to get feedback for retraining triggers
feedbackSchema.statics.getFeedbackForRetraining = async function(companyId, since) {
  return this.find({
    companyId,
    createdAt: { $gte: since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    isProcessed: false
  })
  .populate('userId', 'name email role')
  .sort({ createdAt: -1 })
  .limit(500);
};

// Static method to calculate accuracy score from feedback
feedbackSchema.statics.calculateAccuracyScore = async function(targetType, companyId) {
  const result = await this.aggregate([
    {
      $match: {
        'target.type': targetType,
        companyId,
        'explicit.rating': { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$explicit.rating' },
        count: { $sum: 1 },
        positiveCount: {
          $sum: { $cond: [{ $gte: ['$explicit.rating', 4] }, 1, 0] }
        },
        negativeCount: {
          $sum: { $cond: [{ $lte: ['$explicit.rating', 2] }, 1, 0] }
        }
      }
    }
  ]);

  return result[0] || { avgRating: 0, count: 0, positiveCount: 0, negativeCount: 0 };
};

module.exports = mongoose.model('Feedback', feedbackSchema);
