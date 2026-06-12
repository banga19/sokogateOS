const mongoose = require('mongoose');
const { Schema } = mongoose;

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        customPermissions: { type: Schema.Types.Mixed },
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

teamSchema.virtual('memberCount').get(function () {
  return this.members.length;
});
teamSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
