const express = require('express');
const ctrl = require('../controllers/showController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { liveRules } = require('../validators/episodeValidators');

const router = express.Router();

/**
 * Public: the banner on every page asks this on load. It is a single small
 * document read, and the answer is almost always "no".
 */
router.get('/live', ctrl.getLive);

/** Admin: the "Go live" switch, which also returns the post to paste. */
router.put('/live', writeLimiter, requireAuth, requireAdmin, liveRules, validate, ctrl.setLive);

/**
 * Admin: the weekly slot. Validated in the controller rather than by
 * express-validator, because "is this a real IANA zone name" is a question
 * only Intl can answer.
 */
router.put('/schedule', writeLimiter, requireAuth, requireAdmin, ctrl.setSchedule);

module.exports = router;
