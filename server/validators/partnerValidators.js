const { body, param, query } = require('express-validator');

/**
 * A partner needs a name and somewhere to send a click — but "somewhere" is
 * either a website or contact details, because PRM Painting has no site and
 * the brief is that its logo shows a phone number and an email instead. So
 * neither field is required on its own; the pair is checked together.
 */
const hasSomewhereToGo = body().custom((_value, { req }) => {
  const { websiteUrl, phone, email } = req.body;
  if (websiteUrl || phone || email) return true;
  throw new Error('Give a website, or a phone number or email to show instead');
});

const createRules = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('A name is required'),
  body('kind').optional().isIn(['sponsor', 'organisation']).withMessage("Kind must be 'sponsor' or 'organisation'"),
  body('logoUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('websiteUrl')
    .optional({ values: 'falsy' })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('The website must start with http:// or https://'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('That email address is not valid'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('displayOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  hasSomewhereToGo,
];

/** Update allows a partial body, so the pair check does not apply. */
const updateRules = [
  param('id').isMongoId().withMessage('Invalid partner id'),
  body('name').optional().trim().isLength({ min: 1, max: 150 }),
  body('kind').optional().isIn(['sponsor', 'organisation']),
  body('logoUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('websiteUrl')
    .optional({ values: 'falsy' })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('The website must start with http:// or https://'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('email').optional({ values: 'falsy' }).trim().isEmail(),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('displayOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const reorderRules = [
  body('ids').isArray({ min: 1 }).withMessage('Send the ids in their new order'),
  body('ids.*').isMongoId().withMessage('Every id must be valid'),
];

const listRules = [
  query('kind').optional().isIn(['sponsor', 'organisation']).withMessage("Kind must be 'sponsor' or 'organisation'"),
];

const idRule = [param('id').isMongoId().withMessage('Invalid partner id')];

module.exports = { createRules, updateRules, reorderRules, listRules, idRule };
