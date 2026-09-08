/**
 * Pulls the news feed and the show archive once, then exits.
 *
 *   npm run feeds:refresh
 *
 * Useful for the first fill after a deploy, and for checking a feed by hand
 * when something looks stale — it prints exactly what the importers did.
 */
const { connectDatabase, disconnectDatabase, mongoose } = require('../models');
const { runImports } = require('../services/importScheduler');

(async () => {
  try {
    await connectDatabase();
    const result = await runImports();

    const line = (label, r) => {
      if (r.skipped) return `${label}: skipped — ${r.reason}`;
      return `${label}: ${r.imported} new, ${r.updated} updated, ${r.failed} skipped (of ${r.seen} seen)`;
    };

    // eslint-disable-next-line no-console
    console.log(`\n[feeds] Finished in ${result.ms} ms`);
    // eslint-disable-next-line no-console
    console.log(`[feeds] ${line('News', result.news)}`);
    // eslint-disable-next-line no-console
    console.log(`[feeds] ${line('Episodes', result.episodes)}\n`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[feeds] Failed:', error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
})();
