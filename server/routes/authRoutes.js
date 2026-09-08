const express = require('express');
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules, changePasswordRules } = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, registerRules, validate, ctrl.register);
router.post('/login', authLimiter, loginRules, validate, ctrl.login);

// Its own limiter: a signed-in user spends one of these on every page load,
// so the brute-force ceiling that suits login would lock out a busy office.
router.post('/refresh', refreshLimiter, ctrl.refresh);

router.post('/logout', requireAuth, ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

router.put('/password', authLimiter, requireAuth, changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
