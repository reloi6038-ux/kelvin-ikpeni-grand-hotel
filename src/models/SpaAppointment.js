const mongoose = require('mongoose');

const spaAppointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    guestName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    treatment: { type: String, required: true },
    treatmentDuration: { type: String },
    therapist: { type: String, default: 'Any available' },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true },
    guests: { type: Number, default: 1, min: 1, max: 4 },
    specialRequests: { type: String, maxlength: 800 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

/* ---------------------------------------------------------------
 * Auto-generate a unique appointment reference.
 * Uses a SYNCHRONOUS pre-save hook — no `next`, no `async`.
 * This is the modern Mongoose pattern and avoids the
 * "next is not a function" error.
 * --------------------------------------------------------------- */
spaAppointmentSchema.pre('save', function () {
  if (!this.appointmentId) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const ts = Date.now().toString().slice(-6);
    this.appointmentId = `SPA-${ts}-${rand}`;
  }
  // No return value needed — synchronous work only
});

module.exports = mongoose.model('SpaAppointment', spaAppointmentSchema);