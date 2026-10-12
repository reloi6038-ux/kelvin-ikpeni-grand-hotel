const express = require('express');
const router = express.Router();
const {
  createReview, getApprovedReviews, getAllReviews, approveReview, deleteReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', createReview);
router.get('/', getApprovedReviews);
router.get('/all', protect, getAllReviews);
router.put('/:id/approve', protect, approveReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;