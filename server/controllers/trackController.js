const { Track, Playlist } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizePlain } = require('../utils/sanitize');
const { publicUrl } = require('../middleware/upload');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { removeAsset } = require('../utils/media');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** GET /api/tracks */
const listTracks = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = {};

  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ title: pattern }, { artist: pattern }, { album: pattern }];
  }
  if (req.query.genre) filter.genre = req.query.genre;

  const [rows, count] = await Promise.all([
    Track.find(filter)
      .populate({ path: 'uploader', select: 'name' })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit),
    Track.countDocuments(filter),
  ]);

  return res.json({ success: true, data: paginatedResponse({ count, rows }, page, limit) });
});

/** GET /api/tracks/:id */
const getTrack = asyncHandler(async (req, res) => {
  const track = await Track.findById(req.params.id);
  if (!track) throw ApiError.notFound('Track not found');
  return res.json({ success: true, data: { track } });
});

/**
 * POST /api/tracks (admin)
 * multipart/form-data: audio (mp3|wav, required), cover (jpg|png, optional)
 */
const createTrack = asyncHandler(async (req, res) => {
  const audio = req.files?.audio?.[0];
  if (!audio) throw ApiError.badRequest('An audio file is required (field name: "audio")');

  const cover = req.files?.cover?.[0];

  // publicUrl performs the Cloudinary upload when object storage is enabled,
  // so both must be awaited before the document is written.
  const [fileUrl, coverUrl] = await Promise.all([publicUrl(audio), publicUrl(cover)]);

  const track = await Track.create({
    title: sanitizePlain(req.body.title),
    artist: sanitizePlain(req.body.artist) || 'Unknown Artist',
    album: sanitizePlain(req.body.album) || null,
    genre: sanitizePlain(req.body.genre) || null,
    file_url: fileUrl,
    cover_url: coverUrl,
    duration: Number.parseInt(req.body.duration, 10) || 0,
    uploaded_by: req.user._id,
  });

  return res.status(201).json({ success: true, data: { track } });
});

/** PUT /api/tracks/:id (admin) — metadata only; re-upload to replace audio. */
const updateTrack = asyncHandler(async (req, res) => {
  const track = await Track.findById(req.params.id);
  if (!track) throw ApiError.notFound('Track not found');

  if (req.body.title !== undefined) track.title = sanitizePlain(req.body.title);
  if (req.body.artist !== undefined) track.artist = sanitizePlain(req.body.artist) || 'Unknown Artist';
  if (req.body.album !== undefined) track.album = sanitizePlain(req.body.album) || null;
  if (req.body.genre !== undefined) track.genre = sanitizePlain(req.body.genre) || null;
  if (req.body.duration !== undefined) track.duration = Number.parseInt(req.body.duration, 10) || 0;
  if (req.body.coverUrl !== undefined) track.cover_url = req.body.coverUrl || null;

  await track.save();
  return res.json({ success: true, data: { track } });
});

/** DELETE /api/tracks/:id (admin) */
const deleteTrack = asyncHandler(async (req, res) => {
  const track = await Track.findById(req.params.id);
  if (!track) throw ApiError.notFound('Track not found');

  /**
    * Both the audio and the cover art, on disk or in object storage. This used
    * to unlink local files only, so on the host that actually runs in
    * production — where every upload goes to Cloudinary — deleting a track
    * left the audio behind for ever, quietly filling a free-tier quota.
    */
  await removeAsset(track.file_url);
  await removeAsset(track.cover_url);

  // No cascade in MongoDB: pull the id out of every playlist that references
  // it, or those playlists would keep a dangling reference for ever.
  await Playlist.updateMany({ track_ids: track._id }, { $pull: { track_ids: track._id } });
  await track.deleteOne();

  return res.json({ success: true, data: { message: 'Track deleted', id: req.params.id } });
});

/** POST /api/tracks/:id/play — lightweight play counter. */
const incrementPlays = asyncHandler(async (req, res) => {
  const track = await Track.findByIdAndUpdate(
    req.params.id,
    { $inc: { plays: 1 } },
    { returnDocument: 'after' }
  );
  if (!track) throw ApiError.notFound('Track not found');
  return res.json({ success: true, data: { id: String(track._id), plays: track.plays } });
});

module.exports = { listTracks, getTrack, createTrack, updateTrack, deleteTrack, incrementPlays };
