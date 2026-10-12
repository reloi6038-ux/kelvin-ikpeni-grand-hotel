const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

/* ---------------------------------------------------------------
 * Hash password before save.
 * Uses a promise-returning hook (no `next` callback) — the modern
 * Mongoose pattern that avoids "next is not a function" errors.
 * --------------------------------------------------------------- */
adminSchema.pre('save', function () {
  if (!this.isModified('password')) return;

  return bcrypt
    .genSalt(12)
    .then((salt) => bcrypt.hash(this.password, salt))
    .then((hash) => {
      this.password = hash;
    });
});

/* ---------------------------------------------------------------
 * Compare a plaintext candidate against the stored hash.
 * --------------------------------------------------------------- */
adminSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);