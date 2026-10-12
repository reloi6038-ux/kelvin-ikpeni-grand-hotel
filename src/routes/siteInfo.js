const express = require('express');
const router = express.Router();
const { getSiteInfo, updateSiteInfo } = require('../controllers/siteInfoController');
const { protect } = require('../middleware/auth');

router.get('/', getSiteInfo);
router.put('/', protect, updateSiteInfo);

module.exports = router;