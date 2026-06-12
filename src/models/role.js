const mongoose = require('mongoose');
const { Schema } = mongoose;

const roleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },

    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    permissions: [
      {
        domain: { type: String, required: true },
        actions: [{ type: String, required: true }],
      },
    ],

    inheritsFrom: { type: Schema.Types.ObjectId, ref: 'Role' },

    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roleSchema.index({ companyId: 1, slug: 1 }, { unique: true, sparse: true });
roleSchema.index({ isSystem: 1 });

module.exports = mongoose.model('Role', roleSchema);
