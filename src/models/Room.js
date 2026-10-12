const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    type: {
      type: String,
      enum: ['Standard', 'Deluxe', 'Executive', 'Suite', 'Presidential'],
      required: true,
    },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 200 },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, default: 2 },
    beds: { type: String, default: '1 King Bed' },
    size: { type: String, default: '45 sqm' },
    amenities: [{ type: String }],
    images: [{ type: String }],
    totalRooms: { type: Number, default: 10 },
    availableRooms: { type: Number, default: 10 },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ---------------------------------------------------------------
 * Auto-generate a URL-friendly slug from the room name.
 * Uses a SYNCHRONOUS pre-save hook — no `next`, no `async`.
 * --------------------------------------------------------------- */
roomSchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

module.exports = mongoose.model('Room', roomSchema);