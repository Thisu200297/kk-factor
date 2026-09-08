const express = require('express');
const ctrl = require('../controllers/radioController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { streamRules, idRule } = require('../validators/mediaValidators');

const router = express.Router();

router.get('/streams', optionalAuth, ctrl.listStreams);
router.get('/streams/:id', idRule, validate, ctrl.getStream);
router.get('/streams/:id/now-playing', idRule, validate, ctrl.nowPlaying);

router.post('/streams', writeLimiter, requireAuth, requireAdmin, streamRules, validate, ctrl.createStream);
router.put('/streams/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.updateStream);
router.delete('/streams/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deleteStream);

module.exports = router;
