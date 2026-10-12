const Review = require('../models/Review');

exports.createReview = async (req, res, next) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json({ success: true, message: 'Review submitted for approval', review });
  } catch (error) {
    next(error);
  }
};

exports.getApprovedReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ isApproved: true }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

exports.getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

exports.approveReview = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id, { isApproved: true }, { new: true }
    );
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    res.json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};