const express = require('express');
const ctrl = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { categoryRules } = require('../validators/userValidators');
const { idRule } = require('../validators/mediaValidators');

const router = express.Router();

router.get('/', ctrl.listCategories);
router.post('/', writeLimiter, requireAuth, requireAdmin, categoryRules, validate, ctrl.createCategory);
router.put('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.updateCategory);
router.delete('/:id', writeLimiter, requireAuth, requireAdmin, idRule, validate, ctrl.deleteCategory);

module.exports = router;
