const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, maxlength: 120 },
    comment: { type: String, required: true, maxlength: 1000 },
    roomType: { type: String },
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);