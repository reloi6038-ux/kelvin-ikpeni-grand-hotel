const Newsletter = require('../models/Newsletter');

exports.subscribe = async (req, res, next) => {
  try {
    const { email, consent, source } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }
    if (!consent) {
      return res.status(400).json({ success: false, message: 'Consent is required to subscribe' });
    }

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });

    if (existing) {
      if (existing.isActive) {
        return res.status(200).json({ success: true, message: 'You are already subscribed' });
      }
      existing.isActive = true;
      existing.unsubscribedAt = undefined;
      existing.consent = true;
      await existing.save();
      return res.json({ success: true, message: 'Welcome back! Subscription reactivated' });
    }

    await Newsletter.create({
      email: email.toLowerCase(),
      consent: true,
      source: source || 'homepage',
    });

    res.status(201).json({ success: true, message: 'Thank you for subscribing' });
  } catch (error) {
    next(error);
  }
};

exports.getSubscribers = async (req, res, next) => {
  try {
    const subscribers = await Newsletter.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, count: subscribers.length, subscribers });
  } catch (error) {
    next(error);
  }
};