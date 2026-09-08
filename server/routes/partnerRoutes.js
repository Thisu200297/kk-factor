const express = require('express');
const ctrl = require('../controllers/partnerController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const {
  createRules,
  updateRules,
  reorderRules,
  listRules,
  idRule,
} = require('../validators/partnerValidators');

const router = express.Router();

// Static segment before the catch-all /:id, or "reorder" is read as an id.
router.put('/reorder', writeLimiter, requireAuth, requireAdmin, reorderRules, validate, ctrl.reorderPartners);

router.get('/', optionalAuth, listRules, validate, ctrl.listPartners);
router.get('/:id', idRule, validate, ctrl.getPartner);

// Not rate limited as a write: it is a public counter, and the global API
// limiter already covers it.
router.post('/:id/click', idRule, validate, ctrl.registerClick);

router.post('/', writeLimiter, requireAuth, requireAdmin, createRules, validate, ctrl.createPartner);
router.put('/:id', writeLimiter, requireAuth, requireAdmin, updateRules, validate, ctrl.updatePartner);
router.delete('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deletePartner);

module.exports = router;
