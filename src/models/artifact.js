const mongoose = require('mongoose');
const { Schema } = mongoose;

// Artifact model - represents any company communication or document that gets made AI-legible
// This is the core of sokogateOS's "make companies legible to AI by default" capability
const artifactSchema = new Schema({
  // Reference to the company that owns this artifact
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Artifact classification
  type: {
    type: String,
    enum: [
      'email',           // Email communications
      'whatsapp',        // WhatsApp messages
      'sms',             // SMS messages
      'wechat',          // WeChat messages
      'voice_note',      // Voice notes/audio
      'call_transcript', // Phone call transcripts
      'pdf',             // PDF documents
      'word',            // Word documents
      'excel',           // Excel spreadsheets
      'image',           // Images/photos
      'scanned_document',// Scanned paper documents
      'erp_record',      // ERP/CRM system records
      'social_media',    // Social media posts
      'other'            // Any other type
    ],
    required: true
  },
  
  // Content and processing details
  content: {
    raw: {
      type: String,      // Original raw content (could be large)
      default: ''
    },
    processed: {
      type: String,      // Cleaned/processed text content
      default: ''
    },
    structured: {
      type: Schema.Types.Mixed, // Extracted structured data (JSON)
      default: {}
    }
  },
  
  // Metadata about the artifact
  metadata: {
    source: {
      type: String,      // Where this came from (e.g., "gmail", "whatsapp_business_api")
      default: ''
    },
    sender: {
      type: String,      // Who sent/created it
      default: ''
    },
    recipients: [{
      type: String
    }],
    timestamp: {
      type: Date,        // When the artifact was originally created/received
      default: Date.now
    },
    receivedAt: {
      type: Date,        // When our system received it
      default: Date.now
    },
    language: {
      type: String,      // Detected language (en, ha, yo, ig, sw, fr, ar, etc.)
      default: 'en'
    },
    languageConfidence: {
      type: Number,      // Confidence in language detection (0-1)
      min: 0,
      max: 1,
      default: 0.8
    }
  },
  
  // Processing status and results
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // AI extraction results (what makes it "legible to AI")
  aiExtraction: {
    entities: {
      // Named entities extracted from the content
      people: [{ type: String }],      // Person names
      organizations: [{ type: String }], // Company/org names
      locations: [{ type: String }],   // Locations/addresses
      products: [{ type: String }],    // Product names/descriptions
      quantities: [{                   // Quantities with units
        value: Number,
        unit: String,
        type: { type: String, enum: ['weight', 'volume', 'count', 'length', 'area', 'other'] }
      }],
      prices: [{                       // Price information
        amount: Number,
        currency: { type: String, default: 'USD' },
        type: { type: String, enum: ['unit_price', 'total_price', 'quote', 'invoice'] }
      }],
      dates: [{                        // Important dates
        date: Date,
        type: { type: String, enum: ['delivery_date', 'order_date', 'payment_date', 'expiry_date', 'other'] }
      }],
      contactInfo: [{                  // Contact information
        type: { type: String, enum: ['phone', 'email', 'address', 'website'] },
        value: String
      }]
    },
    intents: [{
      type: { type: String, enum: ['rfq', 'quote_request', 'order', 'complaint', 'inquiry', 'feedback', 'negotiation', 'other'] },
      confidence: { type: Number, min: 0, max: 1, default: 0.5 },
      keywords: [{ type: String }]
    }],
    sentiment: {
      type: { type: String, enum: ['positive', 'negative', 'neutral'] },
      score: { type: Number, min: -1, max: 1, default: 0 } // -1 to 1 scale
    },
    summary: {
      type: String,      // AI-generated summary of the artifact
      default: ''
    },
    confidence: {        // Overall confidence in extraction quality
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  
  // File information (for document-based artifacts)
  fileInfo: {
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number }, // in bytes
    url: { type: String },  // Where the file is stored (S3/local path)
    checksum: { type: String } // For integrity verification
  },
  
  // OCR/ICR results (for image/scanned documents)
  ocrResults: {
    text: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    boundingBoxes: [{      // Text location in image
      text: String,
      x: Number, y: Number, width: Number, height: Number,
      confidence: Number
    }],
    language: { type: String, default: '' }
  },
  
  // Computer vision results (for product images)
  computerVision: {
    objects: [{           // Detected objects in image
      label: String,
      confidence: Number,
      boundingBox: {
        x: Number, y: Number, width: Number, height: Number
      }
    }],
    productAttributes: {  // Extracted product attributes
      color: String,
      size: String,
      material: String,
      condition: { type: String, enum: ['new', 'used', 'refurbished', 'damaged'] },
      brand: String,
      model: String
    },
    qualityIndicators: [{ // Visual quality indicators
      type: { type: String, enum: ['damage', 'wear', 'contamination', 'packaging_issue'] },
      confidence: Number,
      description: String
    }]
  },
  
  // Speech-to-text results (for audio artifacts)
  speechToText: {
    text: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    language: { type: String, default: '' },
    duration: { type: Number }, // in seconds
    words: [{                 // Word-level timestamps
      word: String,
      startTime: Number,
      endTime: Number,
      confidence: Number
    }]
  },
  
  // Feedback and learning (part of self-improving loops)
  feedback: {
    explicit: [{
      type: { type: String, enum: ['correct', 'incorrect', 'partially_correct', 'missing_info'] },
      field: String,      // Which AI extraction field this feedback is for
      value: Schema.Types.Mixed, // What the correct value should be
      providedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      providedAt: { type: Date, default: Date.now },
      notes: String
    }],
    implicit: [{
      // Implicit feedback from user behavior
      action: { type: String, enum: ['accepted', 'rejected', 'modified', 'ignored'] },
      field: String,      // Which field this relates to
      timestamp: { type: Date, default: Date.now },
      context: Schema.Types.Mixed // Additional context about the action
    }]
  },
  
  // Versioning for tracking changes
  version: {
    type: Number,
    default: 1
  },
  
  // Flags for special handling
  isProcessed: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  containsPII: {
    type: Boolean,
    default: false // Should be detected and flagged
  },
  
  // Processing pipeline tracking
  processingPipeline: {
    stepsCompleted: [{ type: String }],  // Which processing steps have been run
    currentStep: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    processingTimeMs: { type: Number }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
artifactSchema.index({ companyId: 1, type: 1 });
artifactSchema.index({ companyId: 1, processingStatus: 1 });
artifactSchema.index({ companyId: 1, 'metadata.timestamp': -1 });
artifactSchema.index({ 'aiExtraction.intents.type': 1 });
artifactSchema.index({ 'aiExtraction.entities.products': 1 });
artifactSchema.index({ 'aiExtraction.entities.prices.amount': 1 });
artifactSchema.index({ 'processingStatus': 1 });
artifactSchema.index({ 'metadata.receivedAt': -1 });
artifactSchema.index({ 'aiExtraction.confidence': -1 });

// Virtual for legibility contribution
artifactSchema.virtual('legibilityContribution').get(function() {
  // Calculate how much this artifact contributes to company legibility
  // Based on processing success, confidence, and completeness
  if (!this.isProcessed || this.processingStatus !== 'completed') {
    return 0;
  }
  
  const baseScore = this.aiExtraction.confidence || 0.5;
  const completenessBonus = Object.keys(this.aiExtraction.entities).filter(key => 
    this.aiExtraction.entities[key] && this.aiExtraction.entities[key].length > 0
  ).length * 0.1;
  
  return Math.min(1, baseScore + completenessBonus);
});

// Method to mark artifact as processed
artifactSchema.methods.markAsProcessed = function() {
  this.isProcessed = true;
  this.processingStatus = 'completed';
  this.processingPipeline.completedAt = new Date();
  
  if (this.processingPipeline.startedAt) {
    this.processingPipeline.processingTimeMs = 
      this.processingPipeline.completedAt - this.processingPipeline.startedAt;
  }
  
  return this.save();
};

// Static method to get processing statistics for a company
artifactSchema.statics.getCompanyProcessingStats = async function(companyId) {
  const stats = await this.aggregate([
    { $match: { companyId: mongoose.Types.ObjectId(companyId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        processed: { 
          $sum: { $cond: [{ $eq: ['$processingStatus', 'completed'] }, 1, 0] } 
        },
        failed: { 
          $sum: { $cond: [{ $eq: ['$processingStatus', 'failed'] }, 1, 0] } 
        },
        pending: { 
          $sum: { $cond: [{ $eq: ['$processingStatus', 'pending'] }, 1, 0] } 
        },
        avgConfidence: {
          $avg: '$aiExtraction.confidence'
        }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('Artifact', artifactSchema);
