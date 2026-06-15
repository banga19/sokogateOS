const mongoose = require('mongoose');
const { Schema } = mongoose;

const accountSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    domain: { type: String, lowercase: true, trim: true, index: true },
    industry: { type: String, trim: true },
    website: { type: String, trim: true },
    phone: { type: String, trim: true },

    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Kenya' },
      postalCode: { type: String, trim: true },
    },

    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    // Sales pipeline stages
    stage: {
      type: String,
      enum: [
        'prospecting',
        'qualification',
        'proposal',
        'negotiation',
        'closed-won',
        'closed-lost',
      ],
      default: 'prospecting',
      index: true,
    },
    dealValue: { type: Number, default: 0 },
    probability: { type: Number, default: 0, min: 0, max: 100 },
    expectedCloseDate: Date,

    // CRM integration external refs
    externalIds: { type: Schema.Types.Mixed },

    tags: [{ type: String, trim: true }],
    notes: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

accountSchema.index({ companyId: 1, stage: 1 });
accountSchema.index({ companyId: 1, domain: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Account', accountSchema);
