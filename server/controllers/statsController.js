const { Article, Track, Playlist, RadioStream, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/stats (admin) — the Overview tiles on the dashboard. */
const overview = asyncHandler(async (_req, res) => {
  const [
    totalArticles,
    publishedArticles,
    draftArticles,
    totalTracks,
    totalPlaylists,
    totalStreams,
    activeStreams,
    totalUsers,
    adminUsers,
    recentArticles,
  ] = await Promise.all([
    Article.countDocuments(),
    Article.countDocuments({ status: 'published' }),
    Article.countDocuments({ status: 'draft' }),
    Track.countDocuments(),
    Playlist.countDocuments(),
    RadioStream.countDocuments(),
    RadioStream.countDocuments({ is_live: true }),
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    Article.find()
      .select('title slug status views published_at created_at')
      .sort({ created_at: -1 })
      .limit(5),
  ]);

  return res.json({
    success: true,
    data: {
      articles: { total: totalArticles, published: publishedArticles, drafts: draftArticles },
      music: { tracks: totalTracks, playlists: totalPlaylists },
      radio: { total: totalStreams, active: activeStreams },
      users: { total: totalUsers, admins: adminUsers },
      recentArticles,
    },
  });
});

module.exports = { overview };
