const jwtLib = require('jsonwebtoken');
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Requires a valid, unexpired access token. Attaches `req.user`.
 * Responds 401 with code TOKEN_EXPIRED so the client knows to hit /refresh
 * instead of bouncing the user straight to the login screen.
 */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('No authentication token provided');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof jwtLib.TokenExpiredError) {
      const expired = ApiError.unauthorized('Access token expired');
      expired.details = { code: 'TOKEN_EXPIRED' };
      throw expired;
    }
    throw ApiError.unauthorized('Invalid authentication token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!user.is_active) throw ApiError.forbidden('Account is disabled');

  req.user = user;
  return next();
});

/** Attaches req.user when a token is present, but never rejects. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && user.is_active) req.user = user;
  } catch {
    /* anonymous request — ignore a bad token */
  }
  return next();
});

/** Role gate. Usage: router.post('/', requireAuth, requireRole('admin'), handler) */
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Requires one of the following roles: ${roles.join(', ')}`));
  }
  return next();
};

const requireAdmin = requireRole('admin');

module.exports = { requireAuth, optionalAuth, requireRole, requireAdmin };
