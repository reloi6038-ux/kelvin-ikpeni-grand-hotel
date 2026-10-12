const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    subtitle: { type: String },
    description: { type: String, required: true },
    discountText: { type: String }, // e.g. "Save 20%" — only shown if verified
    validFrom: { type: Date },
    validUntil: { type: Date },
    image: { type: String },
    ctaText: { type: String, default: 'Discover Offer' },
    ctaLink: { type: String, default: '/booking.html' },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

offerSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Offer', offerSchema);