const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    consent: { type: Boolean, required: true, default: false },
    source: { type: String, default: 'homepage' },
    isActive: { type: Boolean, default: true },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Newsletter', newsletterSchema);