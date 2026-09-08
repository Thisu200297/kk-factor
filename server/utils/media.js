const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const { destroyByUrl } = require('./cloudStorage');

/**
 * Deletes an uploaded asset, wherever it happens to live.
 *
 * A URL in this system is one of three things, and each needs different
 * treatment — which is exactly why this belongs in one place rather than being
 * re-implemented next to every delete handler:
 *
 *   /uploads/...            a file on this server's disk
 *   https://res.cloudinary  an object in our own storage
 *   any other https://      somebody else's image; not ours to touch
 *
 * Never throws. Removing a record must succeed even when tidying up after it
 * does not — a photo nobody can see any more is a smaller problem than a row
 * that refuses to be deleted.
 */
async function removeAsset(url) {
  if (!url) return false;

  if (url.startsWith('/uploads/')) {
    const target = path.resolve(config.uploads.dir, url.replace('/uploads/', ''));
    // Path-traversal guard: a crafted URL must not reach outside the folder.
    if (!target.startsWith(config.uploads.dir)) return false;

    try {
      await fs.promises.unlink(target);
      return true;
    } catch {
      return false; // already gone, or an ephemeral disk that was wiped
    }
  }

  return destroyByUrl(url);
}

module.exports = { removeAsset };
