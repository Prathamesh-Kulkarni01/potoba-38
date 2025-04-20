
const express = require('express');
const router = express.Router();
const { syncDatabases } = require('../controllers/sync');
const { auth } = require('../middleware/auth');

// Sync databases - protected by auth middleware
router.post('/sync-databases', auth, syncDatabases);

module.exports = router;
