const express = require('express');
const ctrl = require('../controllers/episodeController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { createRules, updateRules, idRule } = require('../validators/episodeValidators');

const router = express.Router();

// Before /:id, which also accepts a slug and would otherwise swallow "latest".
router.get('/latest', optionalAuth, ctrl.latestEpisode);

router.get('/', optionalAuth, ctrl.listEpisodes);
router.get('/:id', optionalAuth, ctrl.getEpisode);
router.post('/:id/play', idRule, validate, ctrl.registerPlay);

router.post('/', writeLimiter, requireAuth, requireAdmin, createRules, validate, ctrl.createEpisode);
router.put('/:id', writeLimiter, requireAuth, requireAdmin, updateRules, validate, ctrl.updateEpisode);
router.delete('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deleteEpisode);

module.exports = router;
