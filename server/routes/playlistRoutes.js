const express = require('express');
const ctrl = require('../controllers/playlistController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { playlistRules, idRule } = require('../validators/mediaValidators');

const router = express.Router();

router.get('/', optionalAuth, ctrl.listPlaylists);
router.get('/:id', optionalAuth, ctrl.getPlaylist);
router.post('/', writeLimiter, requireAuth, requireAdmin, playlistRules, validate, ctrl.createPlaylist);
router.put('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.updatePlaylist);
router.delete('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deletePlaylist);

module.exports = router;
