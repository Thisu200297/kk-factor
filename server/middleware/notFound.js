const ApiError = require('../utils/ApiError');

/** Catches any request that fell through the router. */
module.exports = function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
