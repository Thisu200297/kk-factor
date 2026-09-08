const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const shared = {
  standardHeaders: true,
  legacyHeaders: false,
  // Rate limiting would make the test suite flaky and proves nothing there.
  skip: () => config.isTest,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      error: { message: 'Too many requests — please slow down and try again shortly.' },
    }),
};

/** Brute-force protection on login, register and change-password. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  ...shared,
});

/**
 * Refresh gets its own, much higher ceiling.
 *
 * It used to share `authLimiter`, which allows ten requests per IP per fifteen
 * minutes — and a signed-in user spends one on every page load. Four editors
 * behind one office connection would hit "Too many requests" while doing
 * nothing wrong. A refresh needs a valid signed cookie before it can do
 * anything, so a low ceiling buys almost nothing here; this is still enough to
 * stop a runaway loop.
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  ...shared,
});

/** Slightly looser gate on writes so an admin bulk session is not blocked. */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  ...shared,
});

/** Global ceiling for everything else. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  ...shared,
});

module.exports = { authLimiter, refreshLimiter, writeLimiter, apiLimiter };
