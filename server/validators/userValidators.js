const { body, param } = require('express-validator');

const roleRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('role').isIn(['user', 'admin']).withMessage("Role must be either 'user' or 'admin'"),
];

const statusRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean').toBoolean(),
];

const categoryRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Category name must be 2–80 characters'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 400 }),
  body('displayOrder').optional().isInt({ min: 0 }).toInt(),
];

const tierRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('tier').isIn(['normal', 'premium']).withMessage("Tier must be either 'normal' or 'premium'"),
];

module.exports = { roleRules, statusRules, tierRules, categoryRules };
