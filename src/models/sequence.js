const mongoose = require('mongoose');
const { Schema } = mongoose;

const stepSchema = new Schema(
  {
    order: { type: Number, required: true },
    type: {
      type: String,
      enum: ['email', 'call', 'sms', 'whatsapp', 'linkedin', 'task', 'wait'],
      required: true,
    },
    subject: { type: String, trim: true },
    body: { type: String },
    templateId: { type: Schema.Types.ObjectId },
    // channel-specific config
    channelConfig: { type: Schema.Types.Mixed },
    delayMinutes: { type: Number, default: 0 },
  },
  { _id: false }
);

const sequenceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', index: true },

    // Multi-channel
    channels: [{ type: String, enum: ['email', 'call', 'sms', 'whatsapp', 'linkedin'] }],

    // Steps (ordered)
    steps: [stepSchema],

    // Status / lifecycle
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
      index: true,
    },

    // Goals
    dailyCap: { type: Number, default: 50 },
    weeklyCap: { type: Number, default: 300 },
    maxAttempts: { type: Number, default: 5 },

    // Analytics (denormalised for fast reads)
    enrollmentCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    replyRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },

    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    publishedAt: Date,
    archivedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

sequenceSchema.index({ companyId: 1, status: 1 });
sequenceSchema.index({ companyId: 1, ownerId: 1 });

module.exports = mongoose.model('Sequence', sequenceSchema);
