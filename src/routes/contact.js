const express = require('express');
const router = express.Router();
const { createContact, getContacts, updateContact } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');

router.post('/', createContact);
router.get('/', protect, getContacts);
router.put('/:id', protect, updateContact);

module.exports = router;