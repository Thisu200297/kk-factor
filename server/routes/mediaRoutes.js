const express = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/mediaController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const itemRules = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Give it a title'),
  body('caption').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('imageUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('video').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('takenAt').optional({ values: 'falsy' }).isISO8601().withMessage('Use a real date'),
  body('displayOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const idRule = [param('id').isMongoId().withMessage('Invalid id')];

// Before /:id, or "reorder" is read as an id.
router.put('/reorder', writeLimiter, requireAuth, requireAdmin, ctrl.reorderMedia);

router.get('/', optionalAuth, ctrl.listMedia);

router.post('/', writeLimiter, requireAuth, requireAdmin, itemRules, validate, ctrl.createMedia);
router.put('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.updateMedia);
router.delete('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deleteMedia);

module.exports = router;
