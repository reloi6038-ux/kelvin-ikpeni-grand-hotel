const mongoose = require('mongoose');

const siteInfoSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'main' },
    hotelName: { type: String, default: 'The Kelvin Ikpeni Grand Hotel' },
    tagline: { type: String, default: 'Where Timeless Elegance Meets Modern Luxury' },
    address: {
      street: { type: String, default: '123 Grand Avenue, Victoria Island' },
      city: { type: String, default: 'Lagos' },
      state: { type: String, default: 'Lagos State' },
      country: { type: String, default: 'Nigeria' },
      postalCode: { type: String, default: '101241' },
    },
    phone: { type: String, default: '+234 800 KELVIN' },
    email: { type: String, default: 'reservations@kelvinikpenigrand.com' },
    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    mapEmbedUrl: { type: String, default: '' }, // Google Maps embed URL
    coordinates: {
      lat: { type: Number, default: 6.4281 },
      lng: { type: Number, default: 3.4219 },
    },
    establishedYear: { type: Number, default: 2024 },
    starRating: { type: Number, default: 5, min: 1, max: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteInfo', siteInfoSchema);