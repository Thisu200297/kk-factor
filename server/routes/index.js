const express = require('express');

const authRoutes = require('./authRoutes');
const articleRoutes = require('./articleRoutes');
const categoryRoutes = require('./categoryRoutes');
const trackRoutes = require('./trackRoutes');
const playlistRoutes = require('./playlistRoutes');
const radioRoutes = require('./radioRoutes');
const userRoutes = require('./userRoutes');
const uploadRoutes = require('./uploadRoutes');
const partnerRoutes = require('./partnerRoutes');
const episodeRoutes = require('./episodeRoutes');
const showRoutes = require('./showRoutes');
const importRoutes = require('./importRoutes');
const mediaRoutes = require('./mediaRoutes');
const membershipRoutes = require('./membershipRoutes');
const statsController = require('../controllers/statsController');
const articleController = require('../controllers/articleController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { searchRules } = require('../validators/articleValidators');

const router = express.Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() } })
);

router.use('/auth', authRoutes);
router.use('/articles', articleRoutes);
router.use('/categories', categoryRoutes);
router.use('/tracks', trackRoutes);
router.use('/playlists', playlistRoutes);
router.use('/radio', radioRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);

// The KK Factor site: sponsors and the organisations panel, the show archive,
// the live banner, and the feed importers behind both.
router.use('/partners', partnerRoutes);
router.use('/episodes', episodeRoutes);
router.use('/show', showRoutes);
router.use('/import', importRoutes);
router.use('/media', mediaRoutes);
router.use('/membership', membershipRoutes);

// Top-level search, per the API contract in the brief.
router.get('/search', optionalAuth, searchRules, validate, articleController.searchArticles);
router.get('/stats', requireAuth, requireAdmin, statsController.overview);

module.exports = router;
