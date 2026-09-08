const { Setting } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizePlain } = require('../utils/sanitize');

/**
 * The "we are live" banner, and the ready-made social post that goes with it.
 *
 * WHY THERE IS A BUTTON RATHER THAN A DETECTOR. Asking YouTube whether a
 * channel is live means the Data API: an API key, and a search call that costs
 * 100 of a 10,000-unit daily quota, so checking every few minutes eats the
 * whole allowance to answer a question the presenter already knows. She is at
 * the desk pressing "go live" on YouTube anyway; pressing it here too is one
 * more click and no quota, no key, no polling.
 *
 * The same click composes the post she pastes into Facebook, Instagram and the
 * rest. Posting for her is not on: TikTok keeps anything an unaudited app
 * publishes private, Instagram needs a business account and Meta app review,
 * and LinkedIn does not open personal-profile posting to ordinary developers.
 * A composed post and a copy button is the honest version of that feature.
 */

const LIVE_KEY = 'live';
const EMPTY = { isLive: false, title: null, videoId: null, videoUrl: null, startedAt: null };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a bare video id or any of the YouTube URL shapes and returns the id. */
function toVideoId(input) {
  const value = String(input || '').trim();
  if (!value) return null;
  if (YT_ID.test(value)) return value;

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    // `-nocookie` matters: it is the domain our own player embeds from, so a
    // link copied back out of the site has to be readable too.
    /youtube(?:-nocookie)?\.com\/live\/([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(value);
    if (match) return match[1];
  }
  return null;
}

/** The post she pastes into each app. Plain text — every platform takes it. */
function composePost(state, siteUrl) {
  const lines = [
    'WE ARE LIVE ON AIR',
    '',
    state.title ? `${state.title}` : 'THE KK FACTOR — The Greek Eurobeat Show',
    '',
    'Watch and listen now:',
    siteUrl,
  ];
  if (state.videoUrl) lines.push(state.videoUrl);
  lines.push('', '#TheKKFactor #RoulaKrikellis #GreekEurobeat #RPPFM');
  return lines.join('\n');
}

/** GET /api/show/live — public; the banner reads this. */
const getLive = asyncHandler(async (_req, res) => {
  const state = (await Setting.read(LIVE_KEY)) || EMPTY;
  return res.json({ success: true, data: { live: state } });
});

/**
 * PUT /api/show/live (admin)
 * Body: { isLive, title?, video? }  — `video` is an id or any YouTube URL.
 */
const setLive = asyncHandler(async (req, res) => {
  const isLive = Boolean(req.body.isLive);

  if (!isLive) {
    await Setting.write(LIVE_KEY, EMPTY, { isPublic: true });
    return res.json({ success: true, data: { live: EMPTY, post: null } });
  }

  const videoId = toVideoId(req.body.video);
  const state = {
    isLive: true,
    title: sanitizePlain(req.body.title) || 'THE KK FACTOR — The Greek Eurobeat Show',
    videoId,
    videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    startedAt: new Date().toISOString(),
  };

  await Setting.write(LIVE_KEY, state, { isPublic: true });

  const siteUrl = req.body.siteUrl || process.env.PUBLIC_SITE_URL || 'https://thekkfactor.com.au';
  return res.json({ success: true, data: { live: state, post: composePost(state, siteUrl) } });
});

module.exports = { getLive, setLive, toVideoId, composePost, LIVE_KEY };
