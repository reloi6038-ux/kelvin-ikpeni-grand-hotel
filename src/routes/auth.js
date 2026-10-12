const express = require('express');
const router = express.Router();
const { login, getMe, seedAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/seed', seedAdmin);
router.get('/me', protect, getMe);

module.exports = router;