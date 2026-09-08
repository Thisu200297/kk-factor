/**
 * Operational error carrying an HTTP status. Anything thrown that is NOT an
 * ApiError is treated as a programmer error by the error handler and its
 * details are hidden from the client in production.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to perform this action') { return new ApiError(403, msg); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, msg); }
  static conflict(msg = 'Resource already exists') { return new ApiError(409, msg); }
  static payloadTooLarge(msg = 'File is too large') { return new ApiError(413, msg); }
  static unsupportedMedia(msg = 'Unsupported file type') { return new ApiError(415, msg); }
  static tooManyRequests(msg = 'Too many requests') { return new ApiError(429, msg); }
  static internal(msg = 'Internal server error') { return new ApiError(500, msg); }
}

module.exports = ApiError;
