/**
 * =============================================================
 * Spa Controller — business logic for /api/spa
 * =============================================================
 */

const SpaAppointment = require('../models/SpaAppointment');

/* ---------------------------------------------------------------
 * @desc    Create a spa appointment request (public)
 * @route   POST /api/spa
 * @access  Public
 * --------------------------------------------------------------- */
exports.createAppointment = async (req, res, next) => {
  try {
    const {
      guestName,
      email,
      phone,
      treatment,
      treatmentDuration,
      therapist,
      preferredDate,
      preferredTime,
      guests,
      specialRequests,
    } = req.body;

    if (!guestName || !email || !phone || !treatment || !preferredDate || !preferredTime) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    const date = new Date(preferredDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid preferred date.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return res.status(400).json({
        success: false,
        message: 'Preferred date cannot be in the past.',
      });
    }

    const appointment = await SpaAppointment.create({
      guestName: guestName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      treatment,
      treatmentDuration: treatmentDuration || '',
      therapist: therapist || 'Any available',
      preferredDate: date,
      preferredTime,
      guests: Number(guests) || 1,
      specialRequests: (specialRequests || '').trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Spa appointment request received. Our spa team will contact you shortly.',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------------------
 * @desc    Get all spa appointments (admin)
 * @route   GET /api/spa
 * @access  Private
 * --------------------------------------------------------------- */
exports.getAllAppointments = async (req, res, next) => {
  try {
    const appointments = await SpaAppointment.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------------------
 * @desc    Update a spa appointment (admin)
 * @route   PUT /api/spa/:id
 * @access  Private
 * --------------------------------------------------------------- */
exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await SpaAppointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

/* ---------------------------------------------------------------
 * @desc    Delete a spa appointment (admin)
 * @route   DELETE /api/spa/:id
 * @access  Private
 * --------------------------------------------------------------- */
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await SpaAppointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    res.json({ success: true, message: 'Appointment deleted.' });
  } catch (error) {
    next(error);
  }
};