const fs = require('fs');
const app = require('./app');
const config = require('./config/env');
const { connectDatabase, disconnectDatabase, syncIndexes } = require('./config/database');
const imports = require('./services/importScheduler');

async function start() {
  try {
    // Upload folders must exist before the static handler serves from them.
    for (const dir of [config.uploads.dir, config.uploads.imagesDir, config.uploads.tracksDir]) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await connectDatabase();
    // eslint-disable-next-line no-console
    console.log(`[db] Connected to MongoDB (${config.db.uri.replace(/\/\/[^@]*@/, '//***@')})`);

    // Build the unique and lookup indexes declared on the schemas. Doing this
    // explicitly surfaces a duplicate-key clash at boot rather than letting it
    // fail silently in the background.
    const models = await syncIndexes();
    // eslint-disable-next-line no-console
    console.log(`[db] Indexes ready for ${models.length} collections`);

    const server = app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] The KK Factor API listening on http://localhost:${config.port} (${config.env})`);
    });

    // Pull the news feed and the show archive in, then keep them fresh.
    // Started after listen() so a slow feed never delays the first request.
    imports.start();

    const shutdown = (signal) => async () => {
      // eslint-disable-next-line no-console
      console.log(`\n[server] ${signal} received — shutting down gracefully`);
      imports.stop();
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
      // Do not hang forever on in-flight streaming connections.
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', shutdown('SIGTERM'));
    process.on('SIGINT', shutdown('SIGINT'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('\n[server] Failed to start:', error.message);
    if (/ECONNREFUSED|ServerSelection/i.test(error.message)) {
      console.error('[server] MongoDB is not reachable. Check that it is running,');
      console.error('[server] or that MONGODB_URI in server/.env is correct.\n');
    }
    process.exit(1);
  }
}

start();
