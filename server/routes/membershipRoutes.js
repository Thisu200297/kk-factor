const express = require('express');
const ctrl = require('../controllers/membershipController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/** Public: the two cards on the site. */
router.get('/', ctrl.getMembership);

/**
 * Admin: the wording. Validated in the controller — "is this a sensible set
 * of plans" is a shape question rather than a field-by-field one.
 */
router.put('/', writeLimiter, requireAuth, requireAdmin, ctrl.setMembership);

module.exports = router;
