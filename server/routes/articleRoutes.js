const express = require('express');
const ctrl = require('../controllers/articleController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { createRules, updateRules, idRule } = require('../validators/articleValidators');

const router = express.Router();

// Static segments must be declared before the catch-all /:id.
router.get('/trending', ctrl.trending);
router.get('/stats/overview', requireAuth, requireAdmin, ctrl.articleStats);
router.get('/category/:category', optionalAuth, ctrl.getByCategory);

router.get('/', optionalAuth, ctrl.listArticles);
router.get('/:id', optionalAuth, ctrl.getArticle);

router.post('/', writeLimiter, requireAuth, requireAdmin, createRules, validate, ctrl.createArticle);
router.put('/:id', writeLimiter, requireAuth, requireAdmin, updateRules, validate, ctrl.updateArticle);
router.delete('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deleteArticle);

module.exports = router;
