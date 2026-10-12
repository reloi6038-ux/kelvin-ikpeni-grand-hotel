const express = require('express');
const router = express.Router();
const {
  getOffers, getOffer, createOffer, updateOffer, deleteOffer,
} = require('../controllers/offerController');
const { protect } = require('../middleware/auth');

router.route('/').get(getOffers).post(protect, createOffer);
router.route('/:id').get(getOffer).put(protect, updateOffer).delete(protect, deleteOffer);

module.exports = router;