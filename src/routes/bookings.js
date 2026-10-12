const express = require('express');
const router = express.Router();
const {
  createBooking, getAllBookings, getBooking, updateBookingStatus, cancelBooking, getStats,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.post('/', createBooking);
router.get('/', protect, getAllBookings);
router.get('/stats', protect, getStats);
router.get('/:id', getBooking);
router.put('/:id/status', protect, updateBookingStatus);
router.put('/:id/cancel', cancelBooking);

module.exports = router;