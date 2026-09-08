const express = require('express');
const ctrl = require('../controllers/trackController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { uploadTrackBundle } = require('../middleware/upload');
const { trackRules, idRule } = require('../validators/mediaValidators');

const router = express.Router();

router.get('/', ctrl.listTracks);
router.get('/:id', idRule, validate, ctrl.getTrack);
router.post('/:id/play', idRule, validate, ctrl.incrementPlays);

// multer runs first so req.body is populated before the validators inspect it.
router.post(
  '/',
  writeLimiter,
  requireAuth,
  requireAdmin,
  uploadTrackBundle,
  trackRules,
  validate,
  ctrl.createTrack
);
router.put('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.updateTrack);
router.delete('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deleteTrack);

module.exports = router;
