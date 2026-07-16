const router = require('express').Router();
const { getTree } = require('../controllers/organizationController');
const { protect } = require('../middleware/auth');

router.get('/tree', protect, getTree);

module.exports = router;
