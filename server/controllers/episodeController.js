const { Episode } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slugify');
const { sanitizePlain } = require('../utils/sanitize');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

/**
 * What a listener is allowed to see.
 *
 * Hidden episodes are for admins only. Premium episodes are listed for
 * everyone — being able to see that something exists is the point of a
 * premium tier — but `locked` marks the ones this viewer cannot play, and
 * the playable URLs are stripped from those before the response leaves here.
 */
function visibleFilter(req) {
  if (req.user?.role === 'admin') return {};
  return { status: 'published' };
}

function canPlay(episode, user) {
  if (episode.tier !== 'premium') return true;
  return user?.role === 'admin' || user?.tier === 'premium';
}

/** Strips the playable sources from an episode this viewer may not play. */
function forViewer(episode, user) {
  const json = episode.toJSON();
  const playable = canPlay(episode, user);
  json.locked = !playable;
  if (!playable) {
    json.video_url = null;
    json.audio_url = null;
    json.youtube_id = null;
  }
  return json;
}

/** GET /api/episodes */
const listEpisodes = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, { defaultLimit: 12, maxLimit: 60 });
  const filter = visibleFilter(req);

  const [rows, count] = await Promise.all([
    Episode.find(filter).sort({ is_featured: -1, published_at: -1 }).skip(offset).limit(limit),
    Episode.countDocuments(filter),
  ]);

  const data = paginatedResponse({ count, rows }, page, limit);
  data.items = data.items.map((episode) => forViewer(episode, req.user));
  return res.json({ success: true, data });
});

/**
 * GET /api/episodes/latest
 *
 * Powers the big player at the top of the show section, so it answers with the
 * featured episode if there is one and the newest otherwise — the home page
 * should never have to make that decision itself.
 */
const latestEpisode = asyncHandler(async (req, res) => {
  const episode = await Episode.findOne({ status: 'published' }).sort({
    is_featured: -1,
    published_at: -1,
  });

  if (!episode) return res.json({ success: true, data: { episode: null } });
  return res.json({ success: true, data: { episode: forViewer(episode, req.user) } });
});

/** GET /api/episodes/:id — accepts an id or a slug. */
const getEpisode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const episode = await Episode.findOne(isObjectId(id) ? { _id: id } : { slug: id });

  if (!episode) throw ApiError.notFound('Episode not found');
  if (episode.status !== 'published' && req.user?.role !== 'admin') {
    throw ApiError.notFound('Episode not found');
  }

  return res.json({ success: true, data: { episode: forViewer(episode, req.user) } });
});

/**
 * POST /api/episodes (admin)
 *
 * For an episode that did not come from YouTube — an uploaded recording, or
 * one added by hand before the feed catches up.
 */
const createEpisode = asyncHandler(async (req, res) => {
  const title = sanitizePlain(req.body.title);

  const episode = await Episode.create({
    title,
    slug: await uniqueSlug(Episode, title),
    source: req.body.audioUrl ? 'upload' : 'youtube',
    youtube_id: req.body.youtubeId || undefined,
    video_url: req.body.videoUrl || null,
    audio_url: req.body.audioUrl || null,
    thumbnail_url: req.body.thumbnailUrl || null,
    description: sanitizePlain(req.body.description) || null,
    published_at: req.body.publishedAt ? new Date(req.body.publishedAt) : new Date(),
    duration: Number.parseInt(req.body.duration, 10) || 0,
    status: req.body.status || 'published',
    tier: req.body.tier || 'normal',
    is_featured: Boolean(req.body.isFeatured),
  });

  return res.status(201).json({ success: true, data: { episode } });
});

/** PUT /api/episodes/:id (admin) */
const updateEpisode = asyncHandler(async (req, res) => {
  const episode = await Episode.findById(req.params.id);
  if (!episode) throw ApiError.notFound('Episode not found');

  if (req.body.title !== undefined) {
    episode.title = sanitizePlain(req.body.title);
    episode.slug = await uniqueSlug(Episode, episode.title, episode._id);
  }
  if (req.body.description !== undefined) {
    episode.description = sanitizePlain(req.body.description) || null;
  }
  if (req.body.thumbnailUrl !== undefined) episode.thumbnail_url = req.body.thumbnailUrl || null;
  if (req.body.videoUrl !== undefined) episode.video_url = req.body.videoUrl || null;
  if (req.body.audioUrl !== undefined) episode.audio_url = req.body.audioUrl || null;
  if (req.body.duration !== undefined) episode.duration = Number.parseInt(req.body.duration, 10) || 0;
  if (req.body.status !== undefined) episode.status = req.body.status;
  if (req.body.tier !== undefined) episode.tier = req.body.tier;
  if (req.body.publishedAt !== undefined) episode.published_at = new Date(req.body.publishedAt);

  /**
   * Featuring is exclusive — the show page has one slot at the top. Clearing
   * the old one here means an editor never has to remember to un-feature it.
   */
  if (req.body.isFeatured !== undefined) {
    episode.is_featured = Boolean(req.body.isFeatured);
    if (episode.is_featured) {
      await Episode.updateMany(
        { _id: { $ne: episode._id }, is_featured: true },
        { $set: { is_featured: false } }
      );
    }
  }

  await episode.save();
  return res.json({ success: true, data: { episode } });
});

/** DELETE /api/episodes/:id (admin) */
const deleteEpisode = asyncHandler(async (req, res) => {
  const episode = await Episode.findByIdAndDelete(req.params.id);
  if (!episode) throw ApiError.notFound('Episode not found');
  return res.json({ success: true, data: { message: 'Episode removed', id: req.params.id } });
});

/** POST /api/episodes/:id/play — play counter, same shape as tracks. */
const registerPlay = asyncHandler(async (req, res) => {
  const episode = await Episode.findByIdAndUpdate(
    req.params.id,
    { $inc: { plays: 1 } },
    { returnDocument: 'after' }
  );
  if (!episode) throw ApiError.notFound('Episode not found');
  return res.json({ success: true, data: { id: String(episode._id), plays: episode.plays } });
});

module.exports = {
  listEpisodes,
  latestEpisode,
  getEpisode,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  registerPlay,
};
