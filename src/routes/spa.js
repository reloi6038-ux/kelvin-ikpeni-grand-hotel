const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAllAppointments,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/spaController');
const { protect } = require('../middleware/auth');

router.post('/', createAppointment);
router.get('/', protect, getAllAppointments);
router.put('/:id', protect, updateAppointment);
router.delete('/:id', protect, deleteAppointment);

module.exports = router;