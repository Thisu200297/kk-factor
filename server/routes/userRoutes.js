const express = require('express');
const ctrl = require('../controllers/userController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { roleRules, statusRules, tierRules } = require('../validators/userValidators');
const { idRule } = require('../validators/mediaValidators');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', ctrl.listUsers);
router.put('/:id/role', writeLimiter, roleRules, validate, ctrl.updateRole);
router.put('/:id/status', writeLimiter, statusRules, validate, ctrl.updateStatus);
router.put('/:id/tier', writeLimiter, tierRules, validate, ctrl.updateTier);
router.delete('/:id', writeLimiter, idRule, validate, ctrl.deleteUser);

module.exports = router;
