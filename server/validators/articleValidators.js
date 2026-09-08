const { body, param, query } = require('express-validator');

const createRules = [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3–255 characters'),
  body('content').isString().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('excerpt').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Excerpt cannot exceed 500 characters'),
  body('categoryId').isMongoId().withMessage('A valid category is required'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('imageUrl').optional({ values: 'falsy' }).isLength({ max: 500 }),
  body('isBreaking').optional().isBoolean().toBoolean(),
  body('isFeatured').optional().isBoolean().toBoolean(),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid article id'),
  body('title').optional().trim().isLength({ min: 3, max: 255 }),
  body('content').optional().isString().isLength({ min: 10 }),
  body('excerpt').optional({ values: 'falsy' }).isLength({ max: 500 }),
  body('categoryId').optional().isMongoId().withMessage('A valid category is required'),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('isBreaking').optional().isBoolean().toBoolean(),
  body('isFeatured').optional().isBoolean().toBoolean(),
];

const idRule = [param('id').isMongoId().withMessage('Invalid article id')];

const searchRules = [
  query('q').trim().isLength({ min: 2, max: 120 }).withMessage('Search query must be 2–120 characters'),
];

module.exports = { createRules, updateRules, idRule, searchRules };
