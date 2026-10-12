const Booking = require('../models/Booking');
const Room = require('../models/Room');

exports.createBooking = async (req, res, next) => {
  try {
    const { guestName, email, phone, roomId, checkIn, checkOut, guests, rooms, specialRequests } = req.body;

    if (!guestName || !email || !phone || !roomId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({ success: false, message: 'Room not available' });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    }
    if (checkInDate < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ success: false, message: 'Check-in cannot be in the past' });
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const roomCount = Number(rooms) || 1;
    const totalPrice = room.price * nights * roomCount;

    const booking = await Booking.create({
      guestName, email, phone, room: room._id, roomName: room.name,
      checkIn: checkInDate, checkOut: checkOutDate, guests: Number(guests),
      rooms: roomCount, specialRequests, totalPrice, nights, status: 'pending',
    });

    res.status(201).json({ success: true, message: 'Booking created', booking });
  } catch (error) {
    next(error);
  }
};

exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().populate('room', 'name type price').sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { bookingId: req.params.id }],
    }).populate('room');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(paymentStatus && { paymentStatus }) },
      { new: true, runValidators: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id, { status: 'cancelled' }, { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking cancelled', booking });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pending = await Booking.countDocuments({ status: 'pending' });
    const confirmed = await Booking.countDocuments({ status: 'confirmed' });
    const revenue = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'checked-in', 'checked-out'] } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    res.json({
      success: true,
      stats: {
        totalBookings, pending, confirmed,
        revenue: revenue[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};