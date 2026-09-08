const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizePlain } = require('../utils/sanitize');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
  REFRESH_COOKIE,
} = require('../utils/jwt');

/** Issues the access token in the body and the refresh token as an httpOnly cookie. */
function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, user.token_version);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

/** POST /api/auth/register — always creates a 'user'; roles are admin-granted. */
const register = asyncHandler(async (req, res) => {
  const name = sanitizePlain(req.body.name);
  const email = String(req.body.email).toLowerCase().trim();

  const existing = await User.exists({ email });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = await User.create({
    name,
    email,
    password_hash: await User.hashPassword(req.body.password),
    role: 'user',
  });

  const accessToken = issueSession(res, user);
  return res.status(201).json({
    success: true,
    data: { user: user.toPublicJSON(), accessToken },
  });
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();

  const user = await User.findOne({ email }).select('+password_hash');
  // Same message for "no such user" and "wrong password" — no account enumeration.
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await user.verifyPassword(req.body.password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');
  if (!user.is_active) throw ApiError.forbidden('This account has been disabled');

  const accessToken = issueSession(res, user);
  return res.json({
    success: true,
    data: { user: user.toPublicJSON(), accessToken },
  });
});

/** POST /api/auth/refresh — swaps a valid refresh cookie for a new access token. */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Refresh token is invalid or has expired');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.is_active) throw ApiError.unauthorized('Session is no longer valid');
  // token_version changes on logout-all / role change, invalidating old cookies.
  if (payload.ver !== user.token_version) throw ApiError.unauthorized('Session has been revoked');

  const accessToken = issueSession(res, user);
  return res.json({ success: true, data: { user: user.toPublicJSON(), accessToken } });
});

/** POST /api/auth/logout */
const logout = asyncHandler(async (req, res) => {
  const opts = refreshCookieOptions();
  delete opts.maxAge;
  res.clearCookie(REFRESH_COOKIE, opts);

  if (req.user) {
    // Invalidate every outstanding refresh token for this account.
    await User.updateOne({ _id: req.user._id }, { $inc: { token_version: 1 } });
  }
  return res.json({ success: true, data: { message: 'Logged out' } });
});

/** GET /api/auth/me */
const me = asyncHandler(async (req, res) =>
  res.json({ success: true, data: { user: req.user.toPublicJSON() } })
);

/**
 * PUT /api/auth/password
 *
 * Until this existed, nobody could change a password at all — the admin
 * credentials were printed in the setup document and the only way to change
 * them was to edit .env and re-seed, which meant asking the developer. A
 * password somebody cannot change is a password they will never change.
 *
 * The current password is required even though the caller is already signed
 * in: an access token lasts fifteen minutes, and a borrowed laptop should not
 * be enough to lock the owner out of their own account.
 */
const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password_hash');
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  const ok = await user.verifyPassword(req.body.currentPassword);
  if (!ok) throw ApiError.unauthorized('That is not your current password');

  if (req.body.currentPassword === req.body.newPassword) {
    throw ApiError.badRequest('The new password must be different from the old one');
  }

  user.password_hash = await User.hashPassword(req.body.newPassword);
  /**
   * Every other session is signed out. If the reason for changing it was that
   * somebody else knew the old one, leaving their session alive would defeat
   * the whole exercise. This one gets a fresh cookie below.
   */
  user.token_version += 1;
  await user.save();

  const accessToken = issueSession(res, user);
  return res.json({
    success: true,
    data: {
      user: user.toPublicJSON(),
      accessToken,
      message: 'Password changed. Any other devices have been signed out.',
    },
  });
});

module.exports = { register, login, refresh, logout, me, changePassword };
