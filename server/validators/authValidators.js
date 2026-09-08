const { body } = require('express-validator');

/** One definition of "strong enough", used by register and by change-password. */
const passwordPolicy = (field) =>
  body(field)
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number');

const registerRules = [
  /**
   * No `.escape()` here on purpose.
   *
   * It entity-encodes the name before it is stored, and React escapes the
   * string again when it renders — so someone signing up as O'Brien was
   * greeted as "O&#39;Brien" on their own byline. The protection it was
   * reaching for is already in place: the controller runs every name through
   * sanitizePlain(), which strips markup outright rather than encoding it.
   */
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2–120 characters'),
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  passwordPolicy('password'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('currentPassword').isString().notEmpty().withMessage('Enter your current password'),
  passwordPolicy('newPassword'),
];

module.exports = { registerRules, loginRules, changePasswordRules };
