const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Terminates a validator chain: collects express-validator errors and
 * converts them into a single 400 with a field-keyed detail object.
 */
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = {};
  for (const err of result.array()) {
    const field = err.path || err.param || '_';
    if (!details[field]) details[field] = err.msg;
  }
  return next(ApiError.badRequest('Validation failed', details));
}

module.exports = validate;
