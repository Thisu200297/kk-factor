const { User, Article, Track, Playlist } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

/** GET /api/users (admin) */
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

  const [rows, count] = await Promise.all([
    User.find().sort({ created_at: -1 }).skip(offset).limit(limit),
    User.countDocuments(),
  ]);

  const data = paginatedResponse({ count, rows }, page, limit);
  data.items = data.items.map((u) => u.toPublicJSON());
  return res.json({ success: true, data });
});

/** PUT /api/users/:id/role (admin) */
const updateRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.equals(req.user._id)) throw ApiError.badRequest('You cannot change your own role');

  // Never let the last admin be demoted — that would lock everyone out of the CMS.
  if (user.role === 'admin' && req.body.role !== 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) throw ApiError.conflict('Cannot demote the only remaining administrator');
  }

  user.role = req.body.role;
  user.token_version += 1; // force re-authentication with the new role
  await user.save();

  return res.json({ success: true, data: { user: user.toPublicJSON() } });
});

/** PUT /api/users/:id/status (admin) — enable/disable an account. */
const updateStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.equals(req.user._id)) throw ApiError.badRequest('You cannot disable your own account');

  user.is_active = Boolean(req.body.isActive);
  user.token_version += 1;
  await user.save();

  return res.json({ success: true, data: { user: user.toPublicJSON() } });
});

/**
 * DELETE /api/users/:id (admin)
 *
 * MySQL refused this with ON DELETE RESTRICT while the user had articles.
 * MongoDB will not, so the rule is enforced here — otherwise every article
 * they wrote would be left pointing at an author that no longer exists.
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.equals(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');

  const authored = await Article.countDocuments({ author_id: user._id });
  if (authored > 0) {
    throw ApiError.conflict(
      `Cannot delete: this user has authored ${authored} article(s). Disable the account instead.`
    );
  }

  // Uploads and playlists survive their owner, matching the old ON DELETE SET NULL.
  await Promise.all([
    Track.updateMany({ uploaded_by: user._id }, { $set: { uploaded_by: null } }),
    Playlist.updateMany({ created_by: user._id }, { $set: { created_by: null } }),
  ]);

  await user.deleteOne();
  return res.json({ success: true, data: { message: 'User deleted', id: req.params.id } });
});

/**
 * PUT /api/users/:id/tier (admin)
 *
 * Membership level, which is separate from `role` on purpose: `role` decides
 * who may edit the site, `tier` decides who may play an episode marked for
 * members. There is no payment system behind this yet — an admin sets it by
 * hand — and when one arrives it will set this same field.
 *
 * Unlike a role change this does NOT bump token_version: nothing about it is a
 * security boundary, and signing somebody out mid-episode to tell them they
 * have been upgraded would be a strange way to deliver good news.
 */
const updateTier = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  user.tier = req.body.tier;
  await user.save();

  return res.json({ success: true, data: { user: user.toPublicJSON() } });
});

module.exports = { listUsers, updateRole, updateStatus, updateTier, deleteUser };
