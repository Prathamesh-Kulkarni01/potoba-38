const express = require('express');
const router = express.Router();
const { syncDatabases } = require('../controllers/sync'); // Ensure this path is correct
const { auth } = require('../middleware/auth');

// Sync databases - protected by auth middleware
router.post('/sync-databases', syncDatabases);

module.exports = router;
