const config = require('../config/env');
const { Episode } = require('../models');
const { uniqueSlug } = require('../utils/slugify');
const { sanitizePlain } = require('../utils/sanitize');
const { fetchFeed, attr, text } = require('./feeds');

/**
 * Imports the show archive from the YouTube channel feed.
 *
 * This is the whole reason the archive needs no work from anyone: the show
 * goes out live on YouTube, YouTube keeps the recording as a normal video the
 * instant the stream ends, and the channel's Atom feed lists it. So "the
 * episode is saved on the website when the live finishes" costs one scheduled
 * read of a public feed and no storage at all.
 *
 * The feed carries roughly the fifteen most recent uploads and no duration,
 * which is why `duration` stays 0 until an editor fills it in. Getting it
 * automatically would mean the YouTube Data API, an API key and a daily quota
 * — a lot of machinery for a number that is already written on the thumbnail.
 */

const FEED_BASE = 'https://www.youtube.com/feeds/videos.xml?channel_id=';

/** Pulls the thumbnail and description out of Atom's <media:group>. */
function fromMediaGroup(group) {
  if (!group) return { thumbnail: null, description: null };
  const node = Array.isArray(group) ? group[0] : group;
  return {
    thumbnail: attr(node?.['media:thumbnail'], 'url'),
    description: text(node?.['media:description']),
  };
}

/**
 * Runs one import pass. Idempotent — an episode already stored under its
 * video id is refreshed in place, never inserted twice.
 */
async function importEpisodes({ limit = 25 } = {}) {
  const { channelId } = config.show;

  if (!channelId) {
    return { skipped: true, reason: 'YOUTUBE_CHANNEL_ID is not set', imported: 0, updated: 0 };
  }

  const feed = await fetchFeed(`${FEED_BASE}${encodeURIComponent(channelId)}`);
  const items = (feed.items || []).slice(0, limit);

  let imported = 0;
  let updated = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const videoId = String(item.youtubeId || '').trim();
      if (!videoId || !item.title) continue;

      const { thumbnail, description } = fromMediaGroup(item.mediaGroup);

      const fields = {
        title: sanitizePlain(item.title).slice(0, 300),
        source: 'youtube',
        video_url: item.link || `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        description: description ? sanitizePlain(description).slice(0, 5000) : null,
        published_at: item.isoDate ? new Date(item.isoDate) : new Date(),
      };

      const existing = await Episode.findOne({ youtube_id: videoId });

      if (existing) {
        // Title, thumbnail and description are refreshed; status, tier,
        // duration and is_featured are the editor's and are left alone.
        existing.title = fields.title;
        existing.thumbnail_url = fields.thumbnail_url;
        existing.description = fields.description;
        existing.video_url = fields.video_url;
        await existing.save();
        updated += 1;
      } else {
        await Episode.create({
          ...fields,
          slug: await uniqueSlug(Episode, fields.title),
          youtube_id: videoId,
          status: 'published',
          tier: 'normal',
        });
        imported += 1;
      }
    } catch (error) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`[episodes] Skipped "${item?.title || 'untitled'}": ${error.message}`);
    }
  }

  return {
    skipped: false,
    channel: feed.title || channelId,
    seen: items.length,
    imported,
    updated,
    failed,
  };
}

module.exports = { importEpisodes, FEED_BASE };
