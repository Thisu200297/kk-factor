const config = require('../config/env');
const { importNews } = require('./newsImporter');
const { importEpisodes } = require('./episodeImporter');

/**
 * Keeps the news feed and the episode archive fresh.
 *
 * There are deliberately three ways in, because no single one is reliable on
 * the hosting this site runs on:
 *
 *   1. On boot — so a fresh deploy is never empty.
 *   2. On a timer — fine while the service is awake.
 *   3. POST /api/import/run — the one that actually matters in production.
 *      Render's free plan stops the service after fifteen idle minutes, and a
 *      stopped service runs no timers, so an outside scheduler (cron-job.org
 *      is free) calling this endpoint is what guarantees the feed keeps
 *      moving. It doubles as the "refresh now" button in the dashboard.
 *
 * Runs never overlap: a pass still in flight is returned to the next caller
 * rather than started again, so a stuck feed cannot stack up requests.
 */

let inFlight = null;
let timer = null;
let lastRun = null;

/** Runs both importers, tolerating either one failing. */
async function runImports(options = {}) {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const startedAt = new Date();
    const settled = await Promise.allSettled([
      importNews(options.news || {}),
      importEpisodes(options.episodes || {}),
    ]);

    const unwrap = (result) =>
      result.status === 'fulfilled'
        ? result.value
        : { skipped: true, reason: result.reason?.message || 'failed', imported: 0, updated: 0 };

    lastRun = {
      startedAt,
      finishedAt: new Date(),
      ms: Date.now() - startedAt.getTime(),
      news: unwrap(settled[0]),
      episodes: unwrap(settled[1]),
    };
    return lastRun;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** What the dashboard shows under "last refreshed". */
function getLastRun() {
  return lastRun;
}

function start() {
  const minutes = config.imports.intervalMinutes;
  if (!minutes) return;

  // A moment after boot, so the first request is not competing with an import.
  setTimeout(() => {
    runImports().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[imports] First run failed:', error.message);
    });
  }, 8000).unref();

  timer = setInterval(() => {
    runImports().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[imports] Scheduled run failed:', error.message);
    });
  }, minutes * 60 * 1000);
  timer.unref();

  // eslint-disable-next-line no-console
  console.log(`[imports] Feeds refresh every ${minutes} minutes (and on demand)`);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { runImports, getLastRun, start, stop };
