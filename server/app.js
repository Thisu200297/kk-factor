const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const config = require("./config/env");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const ApiError = require("./utils/ApiError");

const app = express();

/**
 * The production CSP is `script-src 'self'`, which blocks inline <script>.
 * index.html carries exactly one: the snippet that applies the saved colour
 * scheme before the first paint. Rather than weakening the policy with
 * 'unsafe-inline', its sha256 is computed from the built file at boot and
 * allow-listed. Editing the snippet changes the hash automatically, so this
 * cannot drift out of date the way a hard-coded hash would.
 *
 * This was found by loading the production build in a real browser: the page
 * rendered, but the console showed the script being refused.
 */
function inlineScriptHashes(indexPath) {
  try {
    const html = fs.readFileSync(indexPath, "utf8");
    const hashes = [];
    const re = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let match = re.exec(html);
    while (match) {
      const digest = crypto
        .createHash("sha256")
        .update(match[1], "utf8")
        .digest("base64");
      hashes.push(`'sha256-${digest}'`);
      match = re.exec(html);
    }
    return hashes;
  } catch {
    return [];
  }
}

// Behind an ALB / nginx, trust the proxy so rate limiting sees real client IPs.
app.set("trust proxy", 1);

const clientDist = path.join(__dirname, "..", "client", "dist");
const clientIndex = path.join(clientDist, "index.html");

/* --- Security headers ---------------------------------------------------- */
app.use(
  helmet({
    // Audio and cover art are consumed cross-origin by the client dev server.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    /**
     * Helmet's default is `no-referrer`, and that breaks the embedded show.
     *
     * YouTube decides whether a video may play in a frame by looking at the
     * Referer header and checking the domain against the video's embedding
     * settings. With no referrer at all it cannot make that check and refuses
     * with a bare "Video player configuration error - Error 153" on a black
     * rectangle, which looks for all the world like a broken video id.
     *
     * `strict-origin-when-cross-origin` is what browsers themselves default
     * to: the origin only (never the path) to another https site, and nothing
     * at all when the destination downgrades to http.
     */
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: config.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "https:", "http:"], // Icecast/SHOUTcast endpoints
            connectSrc: ["'self'", "https:"],
            scriptSrc: ["'self'", ...inlineScriptHashes(clientIndex)],
            /**
             * index.html asks Google Fonts for Inter. Without these two the
             * stylesheet and the font files are both refused in production,
             * the page silently falls back to a system face, and the console
             * fills with violations on every load.
             */
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            // The show embeds YouTube, which will not render in a frame the
            // policy has not been told about.
            frameSrc: ["'self'", "https://www.youtube-nocookie.com", "https://www.youtube.com"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
  }),
);

/* --- CORS: allow-list only, and ONLY on the API ---------------------------- */
/**
 * Mounted on /api rather than globally, which matters more than it looks.
 *
 * Vite stamps `crossorigin` onto the <script> and <link> tags it generates, so
 * the browser fetches the app's own JavaScript and CSS in CORS mode and sends
 * an Origin header even though the request is same-origin. Under a global
 * allow-list the site's own bundle is rejected with 403 unless FRONTEND_URL
 * happens to name the exact deployed URL — a blank white page whose only clue
 * is a 403 on a file that plainly exists. Static files and the app shell have
 * nothing to protect with CORS, so the check belongs on the API alone.
 *
 * Found by loading the production build in a browser; curl never reproduces it,
 * because curl does not send an Origin header.
 */
const apiCors = cors({
  origin(origin, callback) {
    // Same-origin / curl / server-to-server requests carry no Origin header.
    if (!origin) return callback(null, true);
    if (config.frontendOrigins.includes(origin)) return callback(null, true);
    // A plain Error here would surface as a 500 "Internal server error",
    // which sends developers hunting for a bug that does not exist. An
    // ApiError gives them a 403 that names the actual problem.
    return callback(
      ApiError.forbidden(
        `Origin ${origin} is not in the CORS allow-list. ` +
          `Add it to FRONTEND_URL in server/.env (comma-separated for several origins).`,
      ),
    );
  },
  credentials: true, // required for the httpOnly refresh cookie
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

/* --- Parsers and general middleware -------------------------------------- */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(compression());
if (!config.isTest) app.use(morgan(config.isProd ? "combined" : "dev"));

/* --- Static media --------------------------------------------------------- */
// Uploaded audio must support HTTP range requests so the player can seek;
// express.static handles Range automatically.
app.use(
  "/uploads",
  express.static(config.uploads.dir, {
    maxAge: config.isProd ? "7d" : 0,
    setHeaders(res) {
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

/**
 * Second chance for the seeded media.
 *
 * The seed writes the seventeen article photos and the demo tracks into
 * uploads/, but a free host's filesystem is wiped on every restart while the
 * database keeps the /uploads/... URLs pointing at them. seed-assets/ ships
 * inside the repository, so it is always present — serving it as a fallback
 * means the sample content keeps its pictures without touching the database.
 * Files an editor uploaded are unaffected: those live in object storage under
 * absolute URLs and never reach this handler.
 */
const seedAssets = path.join(__dirname, "seed-assets");
const seedFallback = { maxAge: config.isProd ? "7d" : 0, fallthrough: true };
app.use(
  "/uploads/images",
  express.static(path.join(seedAssets, "news"), seedFallback),
);
/**
 * Sponsor and organisation logos.
 *
 * These are the one kind of upload that must NEVER go missing: the strip runs
 * across the top of every page and the businesses in it are paying to be
 * there. A free host wipes the disk on every restart, so the logos ship
 * inside the repository and are served from here. A logo an editor replaces
 * later goes to object storage under an absolute URL and never reaches this
 * handler, so this is a floor, not a ceiling.
 */
app.use(
  "/uploads/images",
  express.static(path.join(seedAssets, "partners"), seedFallback),
);
app.use(
  "/uploads/tracks",
  express.static(path.join(seedAssets, "tracks"), seedFallback),
);

/* --- API ------------------------------------------------------------------ */
app.use("/api", apiCors, apiLimiter, routes);

/* --- The built React app -------------------------------------------------- */
/**
 * One service serves both halves of the site in production. That keeps the
 * whole thing on a single origin, which removes CORS entirely and — more
 * importantly — stops the refresh cookie from being a third-party cookie,
 * which Safari and Firefox block by default.
 */
if (config.serveClient && fs.existsSync(clientIndex)) {
  app.use(
    express.static(clientDist, {
      // Vite fingerprints every asset filename, so they can be cached hard.
      // index.html must not be, or a deploy never reaches returning visitors.
      maxAge: "1y",
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html"))
          res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );

  // Client-side routing: any non-API GET that is not a real file is a React
  // route, so hand back index.html and let the router resolve it.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads"))
      return next();
    return res.sendFile(clientIndex);
  });
} else {
  app.get("/", (_req, res) =>
    res.json({
      success: true,
      data: {
        name: "The KK Factor API",
        version: "1.0.0",
        docs: "/api/health",
      },
    }),
  );
}

/* --- Fallbacks ------------------------------------------------------------ */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
