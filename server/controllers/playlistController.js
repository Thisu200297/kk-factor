const { Playlist, Track } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slugify');
const { sanitizePlain } = require('../utils/sanitize');

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

/**
 * Mongoose's populate does not guarantee the order of the source array, so the
 * tracks are re-sorted back into the stored order. That order is the playlist's
 * running order, so getting it wrong would silently shuffle every playlist.
 */
function withOrderedTracks(playlist) {
  const json = playlist.toJSON();
  const order = (playlist.track_ids || []).map((t) => String(t._id || t));
  if (Array.isArray(json.track_ids)) {
    const byId = new Map(
      json.track_ids.filter((t) => t && t.id).map((t) => [String(t.id), t])
    );
    json.tracks = order.map((id) => byId.get(id)).filter(Boolean);
    json.track_ids = order;
  } else {
    json.tracks = [];
  }
  return json;
}

/** Validates and de-duplicates the incoming track list, preserving order. */
async function resolveTrackIds(trackIds) {
  if (!Array.isArray(trackIds) || trackIds.length === 0) return [];

  const valid = trackIds.filter(isObjectId);
  const found = await Track.find({ _id: { $in: valid } }).select('_id');
  const exists = new Set(found.map((t) => String(t._id)));

  const seen = new Set();
  return valid.filter((id) => {
    if (!exists.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** GET /api/playlists */
const listPlaylists = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { is_public: true };
  const playlists = await Playlist.find(filter)
    .populate('track_ids')
    .populate({ path: 'owner', select: 'name' })
    .sort({ created_at: -1 });

  return res.json({ success: true, data: { items: playlists.map(withOrderedTracks) } });
});

/** GET /api/playlists/:id — accepts an id or a slug. */
const getPlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const identifier = isObjectId(id) ? { _id: id } : { slug: id };

  const playlist = await Playlist.findOne(identifier)
    .populate('track_ids')
    .populate({ path: 'owner', select: 'name' });

  if (!playlist) throw ApiError.notFound('Playlist not found');
  if (!playlist.is_public && req.user?.role !== 'admin') throw ApiError.notFound('Playlist not found');

  return res.json({ success: true, data: { playlist: withOrderedTracks(playlist) } });
});

/** POST /api/playlists (admin) */
const createPlaylist = asyncHandler(async (req, res) => {
  const name = sanitizePlain(req.body.name);

  const playlist = await Playlist.create({
    name,
    slug: await uniqueSlug(Playlist, name),
    description: sanitizePlain(req.body.description) || null,
    cover_url: req.body.coverUrl || null,
    created_by: req.user._id,
    is_public: req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : true,
    track_ids: await resolveTrackIds(req.body.trackIds),
  });

  const full = await Playlist.findById(playlist._id).populate('track_ids');
  return res.status(201).json({ success: true, data: { playlist: withOrderedTracks(full) } });
});

/** PUT /api/playlists/:id (admin) */
const updatePlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist) throw ApiError.notFound('Playlist not found');

  if (req.body.name !== undefined) {
    playlist.name = sanitizePlain(req.body.name);
    playlist.slug = await uniqueSlug(Playlist, playlist.name, playlist._id);
  }
  if (req.body.description !== undefined) {
    playlist.description = sanitizePlain(req.body.description) || null;
  }
  if (req.body.coverUrl !== undefined) playlist.cover_url = req.body.coverUrl || null;
  if (req.body.isPublic !== undefined) playlist.is_public = Boolean(req.body.isPublic);
  if (req.body.trackIds !== undefined) playlist.track_ids = await resolveTrackIds(req.body.trackIds);

  await playlist.save();

  const full = await Playlist.findById(playlist._id).populate('track_ids');
  return res.json({ success: true, data: { playlist: withOrderedTracks(full) } });
});

/** DELETE /api/playlists/:id (admin) */
const deletePlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findByIdAndDelete(req.params.id);
  if (!playlist) throw ApiError.notFound('Playlist not found');
  // The tracks themselves are untouched — only the grouping is removed.
  return res.json({ success: true, data: { message: 'Playlist deleted', id: req.params.id } });
});

module.exports = { listPlaylists, getPlaylist, createPlaylist, updatePlaylist, deletePlaylist };
