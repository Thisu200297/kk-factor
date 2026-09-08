const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { runImports, getLastRun } = require('../services/importScheduler');

/**
 * POST /api/import/run
 *
 * Two callers, one handler:
 *
 *   - an admin pressing "Refresh now" in the dashboard (Bearer token), and
 *   - an outside scheduler, which cannot sign in and instead sends the shared
 *     secret. That path exists because Render's free plan stops the service
 *     after fifteen idle minutes, and a stopped service runs no timers — so
 *     something outside has to knock.
 *
 * The secret is compared in constant time. It is a low-value credential, but a
 * timing-safe comparison costs one function call and removes the question.
 */
const crypto = require('crypto');

function secretMatches(given) {
  const expected = config.imports.secret;
  if (!expected || !given) return false;

  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const run = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const token = req.get('x-import-secret') || req.query.secret;

  if (!isAdmin && !secretMatches(token)) {
    throw ApiError.unauthorized('Sign in as an administrator, or send a valid import secret');
  }

  const result = await runImports();
  return res.json({ success: true, data: result });
});

/** GET /api/import/status (admin) — what the dashboard shows. */
const status = asyncHandler(async (_req, res) =>
  res.json({
    success: true,
    data: {
      lastRun: getLastRun(),
      intervalMinutes: config.imports.intervalMinutes,
      news: {
        feedUrl: config.news.feedUrl,
        sourceName: config.news.sourceName,
        mode: config.news.fullText ? 'fullText' : 'linkOut',
      },
      show: { channelId: config.show.channelId },
    },
  })
);

module.exports = { run, status };
