const mongoose = require('mongoose');
const { Schema } = mongoose;

const enrollmentSchema = new Schema(
  {
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    sequenceId: { type: Schema.Types.ObjectId, ref: 'Sequence', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    // Lifecycle
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'bounced', 'unsubscribed', 'replied'],
      default: 'active',
      index: true,
    },
    currentStep: { type: Number, default: 0 },
    attemptsUsed: { type: Number, default: 0 },

    // Scheduling
    enrolledAt: { type: Date, default: Date.now },
    nextStepAt: { type: Date, index: true },
    completedAt: Date,
    bouncedAt: Date,
    repliedAt: Date,
    unsubscribedAt: Date,

    // Context snapshot (for auditability)
    contactSnapshot: { type: Schema.Types.Mixed },
    sequenceSnapshot: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

enrollmentSchema.index({ companyId: 1, status: 1, nextStepAt: 1 });
enrollmentSchema.index({ sequenceId: 1, status: 1 });
enrollmentSchema.index({ companyId: 1, contactId: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
