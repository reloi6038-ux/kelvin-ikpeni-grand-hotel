const Offer = require('../models/Offer');

exports.getOffers = async (req, res, next) => {
  try {
    const { featured } = req.query;
    const query = { isActive: true };
    if (featured === 'true') query.isFeatured = true;

    // Filter out expired offers
    const now = new Date();
    query.$or = [
      { validUntil: { $exists: false } },
      { validUntil: null },
      { validUntil: { $gte: now } },
    ];

    const offers = await Offer.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: offers.length, offers });
  } catch (error) {
    next(error);
  }
};

exports.getOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slug: req.params.id }],
    });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.createOffer = async (req, res, next) => {
  try {
    const offer = await Offer.create(req.body);
    res.status(201).json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.deleteOffer = async (req, res, next) => {
  try {
    await Offer.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Offer archived' });
  } catch (error) {
    next(error);
  }
};