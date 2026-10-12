const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    guestName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomName: { type: String },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1 },
    rooms: { type: Number, default: 1, min: 1 },
    specialRequests: { type: String, maxlength: 500 },
    totalPrice: { type: Number, required: true },
    nights: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentMethod: { type: String, default: 'pay-at-hotel' },
  },
  { timestamps: true }
);

/* ---------------------------------------------------------------
 * Auto-generate a unique booking reference (KIGH-XXXXXX-XXXX).
 * Uses a SYNCHRONOUS pre-save hook — no `next`, no `async`.
 * --------------------------------------------------------------- */
bookingSchema.pre('save', function () {
  if (!this.bookingId) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString().slice(-6);
    this.bookingId = `KIGH-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model('Booking', bookingSchema);