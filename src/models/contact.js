const mongoose = require('mongoose');
const { Schema } = mongoose;

const contactSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    linkedIn: { type: String, trim: true },

    // Lead lifecycle
    status: {
      type: String,
      enum: ['lead', 'prospect', 'qualified', 'unqualified', 'opportunity', 'customer', 'churned'],
      default: 'lead',
      index: true,
    },
    leadSource: { type: String, trim: true },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },

    // Ownership
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', index: true },

    accountId: { type: Schema.Types.ObjectId, ref: 'Account', index: true },

    // Segments + extensibility
    tags: [{ type: String, trim: true }],
    customFields: { type: Schema.Types.Mixed },

    // Engagement signals
    lastContactedAt: Date,
    lastEmailOpenedAt: Date,
    lastCallAt: Date,

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

contactSchema.index({ companyId: 1, status: 1 });
contactSchema.index({ companyId: 1, ownerId: 1 });
contactSchema.index({ email: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);
