const multer = require('multer');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

/**
 * Single funnel for every error in the app. Translates library-specific
 * errors into ApiError, then emits one consistent JSON envelope.
 */
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, _next) {
  let error = err;

  if (error instanceof mongoose.Error.ValidationError) {
    // Mongoose collects every failing path; surface them keyed by field so the
    // client can attach each message to the right input.
    const details = {};
    for (const [path, item] of Object.entries(error.errors || {})) {
      details[path] = item.message;
    }
    error = ApiError.badRequest('Validation failed', details);
  } else if (error instanceof mongoose.Error.CastError) {
    // A malformed ObjectId in the URL is a bad request, not a server fault.
    error = ApiError.badRequest(`Invalid ${error.path}: "${error.value}"`);
  } else if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`A record with that ${field} already exists`);
  } else if (error instanceof multer.MulterError) {
    error =
      error.code === 'LIMIT_FILE_SIZE'
        ? ApiError.payloadTooLarge('File exceeds the maximum allowed size')
        : ApiError.badRequest(`Upload error: ${error.message}`);
  } else if (error instanceof SyntaxError && 'body' in error) {
    error = ApiError.badRequest('Malformed JSON in request body');
  } else if (error instanceof mongoose.Error && !config.isProd) {
    error = ApiError.internal(error.message);
  }

  if (!(error instanceof ApiError)) {
    // Unexpected — log it in full, but do not leak internals to the client.
    // eslint-disable-next-line no-console
    if (!config.isTest) console.error('[unhandled]', error);
    error = new ApiError(500, config.isProd ? 'Internal server error' : error.message || 'Internal server error');
  }

  const body = {
    success: false,
    error: { message: error.message },
  };
  if (error.details) body.error.details = error.details;
  if (!config.isProd && error.statusCode >= 500) body.error.stack = err.stack;

  return res.status(error.statusCode || 500).json(body);
};
