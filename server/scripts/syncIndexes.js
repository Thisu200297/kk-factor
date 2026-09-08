/**
 * Builds every index declared on the Mongoose schemas.
 * MongoDB creates collections on first write, so there is no "create the
 * database" step — only indexes need an explicit build.
 */
const { connectDatabase, disconnectDatabase, syncIndexes } = require('../models');

(async () => {
  try {
    await connectDatabase();
    const models = await syncIndexes();
    // eslint-disable-next-line no-console
    console.log(`[db] Indexes built for: ${models.join(', ')}`);
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[db] Index build failed:', error.message);
    process.exit(1);
  }
})();
