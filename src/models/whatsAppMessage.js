const mongoose = require('mongoose');
const { Schema } = mongoose;

// WhatsApp Message model — stores conversations for NLP training & self-improving loop
const whatsAppMessageSchema = new Schema({
  // Message identification
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },

  // Participant info
  from: {
    type: String,  // WhatsApp number (E.164 format)
    required: true,
    index: true
  },
  to: {
    type: String,  // Business WhatsApp number
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },

  // Company association (if known)
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Message content
  content: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['text', 'image', 'document', 'audio', 'video', 'location', 'interactive'],
    default: 'text'
  },
  mediaUrl: String,
  mediaMimeType: String,
  mediaSize: Number,

  // NLP processing results
  nlpProcessing: {
    intent: {
      type: String,
      enum: ['sourcing_request', 'order_status', 'supplier_search', 'quote_request',
             'payment_inquiry', 'shipment_tracking', 'customs_query', 'support',
             'greeting', 'confirmation', 'unknown'],
      default: 'unknown'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    extractedEntities: [{
      type: { type: String, enum: ['product', 'quantity', 'specification', 'price', 'location', 'date', 'supplier'] },
      value: Schema.Types.Mixed,
      confidence: { type: Number, min: 0, max: 1 }
    }],
    structuredQuery: {
      productQuery: String,
      category: String,
      quantity: { value: Number, unit: String },
      destination: String,
      specs: [String],
      budget: { amount: Number, currency: { type: String, default: 'USD' } },
      timeline: String
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'urgent'],
      default: 'neutral'
    }
  },

  // Response tracking
  responseMessageId: String,
  responseSentAt: Date,
  responseContent: String,
  wasDelivered: {
    type: Boolean,
    default: false
  },
  deliveryStatus: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'queued'
  },
  deliveryError: String,

  // Conversation context
  contextType: {
    type: String,
    enum: ['rfq', 'order', 'shipment', 'payment', 'support', 'general', 'onboarding'],
    default: 'general'
  },
  relatedRequestId: {
    type: String,  // Could reference a Sourcing requestId, ShipmentId, etc.
    index: true
  },

  // For self-improving loop
  feedback: {
    wasHelpful: Boolean,
    userRating: { type: Number, min: 1, max: 5 },
    correctedIntent: String,
    notes: String
  },

  // Metadata
  channel: {
    type: String,
    enum: ['whatsapp', 'sms'],
    default: 'whatsapp'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
whatsAppMessageSchema.index({ from: 1, createdAt: -1 });
whatsAppMessageSchema.index({ conversationId: 1, createdAt: 1 });
whatsAppMessageSchema.index({ 'nlpProcessing.intent': 1 });
whatsAppMessageSchema.index({ 'nlpProcessing.sentiment': 1 });
whatsAppMessageSchema.index({ createdAt: -1 });
whatsAppMessageSchema.index({ companyId: 1, 'nlpProcessing.intent': 1 });

// Virtual for conversation summary
whatsAppMessageSchema.virtual('conversationMessages').get(function() {
  return null; // Populated at query time
});

// Static: Get conversation history
whatsAppMessageSchema.statics.getConversation = async function(conversationId, limit = 50) {
  return this.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(limit);
};

// Static: Get NLP training data for self-improving loop
whatsAppMessageSchema.statics.getTrainingData = async function(options = {}) {
  const query = {
    'nlpProcessing.intent': { $ne: 'unknown' },
    'nlpProcessing.confidence': { $gte: 0.5 }
  };
  if (options.startDate) query.createdAt = { $gte: options.startDate };
  if (options.intent) query['nlpProcessing.intent'] = options.intent;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 500)
    .select('content nlpProcessing feedback');
};

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
