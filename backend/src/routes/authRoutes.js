const router = require('express').Router();
const { login, logout, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginRules } = require('../utils/validators');

router.post('/login', loginRules, validate, login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);

module.exports = router;
