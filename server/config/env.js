/**
 * Centralised, validated environment configuration.
 * Importing this module is the ONLY sanctioned way to read process.env —
 * it guarantees that a missing secret fails loudly at boot instead of
 * silently producing unsigned tokens at request time.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';
const isProd = NODE_ENV === 'production';

/** Required in every environment except `test`, which uses throwaway values. */
const REQUIRED = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];

if (!isTest) {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(
      `\n[config] Missing required environment variable(s): ${missing.join(', ')}\n` +
        `[config] Open server/.env and fill them in.\n`
    );
    process.exit(1);
  }
}

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
};

const uploadDir = path.resolve(
  __dirname,
  '..',
  process.env.UPLOAD_DIR || './uploads'
);

const config = {
  env: NODE_ENV,
  isTest,
  isProd,
  isDev: NODE_ENV === 'development',
  port: toInt(process.env.PORT, 5000),

  db: {
    /**
     * A single connection string, the way MongoDB is normally configured.
     * Local:  mongodb://127.0.0.1:27017/kk_factor
     * Atlas:  mongodb+srv://user:pass@cluster.mongodb.net/kk_factor
     */
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kk_factor',
  },

  jwt: {
    accessSecret: process.env.JWT_SECRET || 'test_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'test_refresh_secret',
    accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    /** Refresh cookie lifetime in ms — kept in sync with refreshExpiresIn. */
    refreshCookieMaxAge: 7 * 24 * 60 * 60 * 1000,
  },

  uploads: {
    dir: uploadDir,
    imagesDir: path.join(uploadDir, 'images'),
    tracksDir: path.join(uploadDir, 'tracks'),
    maxImageBytes: toInt(process.env.MAX_IMAGE_SIZE_MB, 5) * 1024 * 1024,
    maxAudioBytes: toInt(process.env.MAX_AUDIO_SIZE_MB, 25) * 1024 * 1024,
    /**
     * Free hosting tiers give a container an ephemeral filesystem: anything
     * written to disk is gone on the next restart, redeploy or idle spin-down.
     * When CLOUDINARY_URL is present, uploads are streamed to Cloudinary and
     * the database stores the absolute https URL it returns, so an editor's
     * photos and audio survive. Without it, uploads go to local disk exactly
     * as before — which is what you want on a laptop or a server with a disk.
     */
    toCloudinary: Boolean(process.env.CLOUDINARY_URL),
  },

  /* --- Syndicated news ------------------------------------------------------
   * The community-news panel is filled from another publisher's RSS feed.
   *
   * `fullText` is off by default and should STAY off until that publisher has
   * agreed in writing. Their WordPress feed does carry the whole article in
   * <content:encoded>, but a feed exposing the text is not a licence to
   * republish it; headline, photo, short excerpt and a link back is.
   * ----------------------------------------------------------------------- */
  news: {
    feedUrl: process.env.NEWS_FEED_URL || '',
    sourceName: process.env.NEWS_SOURCE_NAME || 'Greek City Times',
    fullText: toBool(process.env.NEWS_FULL_TEXT, false),
  },

  /* --- The show -------------------------------------------------------------
   * The archive is read from the YouTube channel's public Atom feed, which
   * needs no API key and has no quota. A live stream becomes an ordinary video
   * the moment it ends, so a finished show simply appears.
   * ----------------------------------------------------------------------- */
  show: {
    channelId: process.env.YOUTUBE_CHANNEL_ID || '',
  },

  imports: {
    /** 0 disables the in-process timer; the endpoint still works. */
    intervalMinutes: toInt(process.env.IMPORT_INTERVAL_MINUTES, 30),
    /**
     * Lets an outside scheduler trigger a refresh without an account. Needed
     * because a free Render instance sleeps, and a sleeping instance runs no
     * timers — so something outside has to knock.
     */
    secret: process.env.IMPORT_SECRET || '',
  },

  /**
   * In production the API also serves the built React app from client/dist,
   * so the whole site is one origin: no CORS, and the refresh cookie is never
   * a third-party cookie (Safari blocks those by default).
   */
  serveClient: process.env.SERVE_CLIENT !== 'false' && isProd,

  /** CORS allow-list. Comma-separated FRONTEND_URL supports staging + prod. */
  frontendOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /** Used in the ready-made "we are live" social post. */
  publicSiteUrl: process.env.PUBLIC_SITE_URL || 'http://localhost:5173',

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@kkfactor.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },

  bcryptSaltRounds: 12,
};

module.exports = config;
