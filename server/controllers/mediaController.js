const { MediaItem } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizePlain } = require('../utils/sanitize');
const { removeAsset } = require('../utils/media');
const { toVideoId } = require('./showController');

/** GET /api/media — the gallery. Public; admins also see hidden items. */
const listMedia = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { is_active: true };
  if (req.query.kind) filter.kind = req.query.kind;

  const items = await MediaItem.find(filter).sort({ display_order: 1, created_at: -1 });
  return res.json({ success: true, data: { items } });
});

function fieldsFrom(body) {
  const out = {};
  if (body.title !== undefined) out.title = sanitizePlain(body.title);
  if (body.caption !== undefined) out.caption = sanitizePlain(body.caption) || null;
  if (body.imageUrl !== undefined) out.image_url = body.imageUrl || null;
  if (body.takenAt !== undefined) out.taken_at = body.takenAt ? new Date(body.takenAt) : null;
  if (body.displayOrder !== undefined) out.display_order = body.displayOrder;
  if (body.isActive !== undefined) out.is_active = Boolean(body.isActive);

  if (body.video !== undefined) {
    // Accepts a bare id or any YouTube URL shape, same as the live banner.
    const id = toVideoId(body.video);
    out.youtube_id = id;
    out.kind = id ? 'video' : 'photo';
  }
  return out;
}

/** POST /api/media (admin) */
const createMedia = asyncHandler(async (req, res) => {
  const fields = fieldsFrom(req.body);

  // Order matters: someone who pasted a bad link needs to be told the link is
  // wrong, not that they forgot to paste one.
  if (req.body.video && !fields.youtube_id) {
    throw ApiError.badRequest('That does not look like a YouTube link');
  }
  if (!fields.image_url && !fields.youtube_id) {
    throw ApiError.badRequest('Upload a photo, or paste a YouTube link');
  }

  const count = await MediaItem.countDocuments();
  const item = await MediaItem.create({
    kind: fields.youtube_id ? 'video' : 'photo',
    display_order: count,
    is_active: true,
    ...fields,
  });

  return res.status(201).json({ success: true, data: { item } });
});

/** PUT /api/media/:id (admin) */
const updateMedia = asyncHandler(async (req, res) => {
  const item = await MediaItem.findById(req.params.id);
  if (!item) throw ApiError.notFound('That item is not in the gallery');

  const fields = fieldsFrom(req.body);
  // Replacing the photo means the old file is nobody's any more.
  if (fields.image_url !== undefined && item.image_url && fields.image_url !== item.image_url) {
    await removeAsset(item.image_url);
  }

  Object.assign(item, fields);
  await item.save();

  return res.json({ success: true, data: { item } });
});

/** DELETE /api/media/:id (admin) */
const deleteMedia = asyncHandler(async (req, res) => {
  const item = await MediaItem.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound('That item is not in the gallery');

  await removeAsset(item.image_url);
  return res.json({ success: true, data: { message: 'Removed from the gallery', id: req.params.id } });
});

/** PUT /api/media/reorder (admin) — one bulk write, so the grid never tears. */
const reorderMedia = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) throw ApiError.badRequest('Send the ids in their new order');

  await MediaItem.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { display_order: index } } },
    }))
  );

  const items = await MediaItem.find({ _id: { $in: ids } }).sort({ display_order: 1 });
  return res.json({ success: true, data: { items } });
});

module.exports = { listMedia, createMedia, updateMedia, deleteMedia, reorderMedia };
