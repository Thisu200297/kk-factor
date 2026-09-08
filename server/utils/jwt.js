const jwt = require('jsonwebtoken');
const config = require('../config/env');

/** Short-lived (15 min) token sent in the Authorization header. */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

/** Long-lived (7 day) token delivered as an httpOnly cookie. */
function signRefreshToken(user, tokenVersion = 0) {
  return jwt.sign(
    { sub: user.id, ver: tokenVersion, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwt.accessSecret);
  if (payload.type !== 'access') throw new jwt.JsonWebTokenError('Wrong token type');
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, config.jwt.refreshSecret);
  if (payload.type !== 'refresh') throw new jwt.JsonWebTokenError('Wrong token type');
  return payload;
}

/** httpOnly cookie options — not readable by JS, so immune to XSS token theft. */
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    maxAge: config.jwt.refreshCookieMaxAge,
    path: '/api/auth',
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshCookieOptions,
  REFRESH_COOKIE: 'kk_refresh',
};
