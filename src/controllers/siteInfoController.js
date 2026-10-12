const SiteInfo = require('../models/SiteInfo');

exports.getSiteInfo = async (req, res, next) => {
  try {
    let info = await SiteInfo.findOne({ key: 'main' });
    if (!info) {
      info = await SiteInfo.create({ key: 'main' });
    }
    res.json({ success: true, siteInfo: info });
  } catch (error) {
    next(error);
  }
};

exports.updateSiteInfo = async (req, res, next) => {
  try {
    const info = await SiteInfo.findOneAndUpdate(
      { key: 'main' },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, siteInfo: info });
  } catch (error) {
    next(error);
  }
};