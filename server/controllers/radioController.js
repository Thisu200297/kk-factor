const { RadioStream } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizePlain } = require('../utils/sanitize');

/** GET /api/radio/streams — public listing for the station picker. */
const listStreams = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { is_live: true };
  const items = await RadioStream.find(filter).sort({ display_order: 1, name: 1 });
  return res.json({ success: true, data: { items } });
});

/** GET /api/radio/streams/:id */
const getStream = asyncHandler(async (req, res) => {
  const stream = await RadioStream.findById(req.params.id);
  if (!stream) throw ApiError.notFound('Radio stream not found');
  return res.json({ success: true, data: { stream } });
});

/**
 * GET /api/radio/streams/:id/now-playing
 * Proxies the station's Icecast `status-json.xsl` so the browser is not blocked
 * by the station's CORS policy. Returns null metadata rather than an error when
 * the station does not publish any — "Now Playing" is a nice-to-have.
 */
const nowPlaying = asyncHandler(async (req, res) => {
  const stream = await RadioStream.findById(req.params.id);
  if (!stream) throw ApiError.notFound('Radio stream not found');
  if (!stream.metadata_url) {
    return res.json({ success: true, data: { title: null, listeners: null, source: null } });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(stream.metadata_url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Upstream responded ${response.status}`);
    const payload = await response.json();

    // Icecast returns either an object or an array under icestats.source.
    const raw = payload?.icestats?.source;
    const source = Array.isArray(raw) ? raw[0] : raw;

    return res.json({
      success: true,
      data: {
        title: source?.title || source?.yp_currently_playing || null,
        listeners: source?.listeners ?? null,
        source: source?.server_name || stream.name,
      },
    });
  } catch {
    // Station offline / metadata unavailable — degrade quietly.
    return res.json({ success: true, data: { title: null, listeners: null, source: null } });
  }
});

/** POST /api/radio/streams (admin) */
const createStream = asyncHandler(async (req, res) => {
  const stream = await RadioStream.create({
    name: sanitizePlain(req.body.name),
    stream_url: req.body.streamUrl,
    genre: sanitizePlain(req.body.genre) || null,
    description: sanitizePlain(req.body.description) || null,
    logo_url: req.body.logoUrl || null,
    metadata_url: req.body.metadataUrl || null,
    is_live: req.body.isLive !== undefined ? Boolean(req.body.isLive) : true,
    display_order: req.body.displayOrder ?? 0,
  });
  return res.status(201).json({ success: true, data: { stream } });
});

/** PUT /api/radio/streams/:id (admin) */
const updateStream = asyncHandler(async (req, res) => {
  const stream = await RadioStream.findById(req.params.id);
  if (!stream) throw ApiError.notFound('Radio stream not found');

  if (req.body.name !== undefined) stream.name = sanitizePlain(req.body.name);
  if (req.body.streamUrl !== undefined) stream.stream_url = req.body.streamUrl;
  if (req.body.genre !== undefined) stream.genre = sanitizePlain(req.body.genre) || null;
  if (req.body.description !== undefined) stream.description = sanitizePlain(req.body.description) || null;
  if (req.body.logoUrl !== undefined) stream.logo_url = req.body.logoUrl || null;
  if (req.body.metadataUrl !== undefined) stream.metadata_url = req.body.metadataUrl || null;
  if (req.body.isLive !== undefined) stream.is_live = Boolean(req.body.isLive);
  if (req.body.displayOrder !== undefined) stream.display_order = req.body.displayOrder;

  await stream.save();
  return res.json({ success: true, data: { stream } });
});

/** DELETE /api/radio/streams/:id (admin) */
const deleteStream = asyncHandler(async (req, res) => {
  const stream = await RadioStream.findByIdAndDelete(req.params.id);
  if (!stream) throw ApiError.notFound('Radio stream not found');
  return res.json({ success: true, data: { message: 'Radio stream deleted', id: req.params.id } });
});

module.exports = { listStreams, getStream, nowPlaying, createStream, updateStream, deleteStream };
