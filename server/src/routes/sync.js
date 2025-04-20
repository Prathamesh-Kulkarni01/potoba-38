const express = require('express');
const router = express.Router();
const { syncDatabases } = require('../controllers/sync'); // Ensure this path is correct
const { auth } = require('../middleware/auth');

// Sync databases - protected by auth middleware
// Usage: Send a POST request to `/api/sync-databases` to trigger the database synchronization process.
// Ensure the request is authenticated using the `auth` middleware.
router.post('/sync-databases', syncDatabases);

module.exports = router;
