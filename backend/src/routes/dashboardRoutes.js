const router = require('express').Router();
const { getStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, authorize('SUPER_ADMIN', 'HR_MANAGER'), getStats);

module.exports = router;
