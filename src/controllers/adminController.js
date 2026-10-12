const Booking = require('../models/Booking');
const Contact = require('../models/Contact');
const Room = require('../models/Room');
const Review = require('../models/Review');

exports.getDashboard = async (req, res, next) => {
  try {
    const [totalBookings, pendingBookings, confirmedBookings, totalRooms, totalContacts, unreadContacts, pendingReviews] =
      await Promise.all([
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'pending' }),
        Booking.countDocuments({ status: 'confirmed' }),
        Room.countDocuments({ isActive: true }),
        Contact.countDocuments(),
        Contact.countDocuments({ status: 'new' }),
        Review.countDocuments({ isApproved: false }),
      ]);

    const revenue = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'checked-in', 'checked-out'] } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      dashboard: {
        totalBookings, pendingBookings, confirmedBookings,
        totalRooms, totalContacts, unreadContacts, pendingReviews,
        totalRevenue: revenue[0]?.total || 0,
        recentBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};