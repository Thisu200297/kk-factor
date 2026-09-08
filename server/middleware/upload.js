const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const { uploadBuffer } = require('../utils/cloudStorage');

// Ensure the upload tree exists before multer tries to write into it.
for (const dir of [config.uploads.dir, config.uploads.imagesDir, config.uploads.tracksDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);
const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave']);
const AUDIO_EXT = new Set(['.mp3', '.wav']);

/**
 * Randomised, extension-locked filename. Using a crypto-random stem rather
 * than the client-supplied name removes path-traversal and overwrite risks.
 */
function safeName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

/**
 * On a host with a real disk we keep writing to disk. On an ephemeral free
 * tier (CLOUDINARY_URL set) we hold the file in memory instead, because the
 * bytes have to leave this container before it restarts and forgets them.
 */
function makeStorage(destination) {
  if (config.uploads.toCloudinary) return multer.memoryStorage();
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
  });
}

/** Both the MIME type AND the extension must be on the allow-list. */
function makeFilter(mimeSet, extSet, label) {
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (mimeSet.has(file.mimetype) && extSet.has(ext)) return cb(null, true);
    return cb(ApiError.unsupportedMedia(`Only ${label} files are accepted`));
  };
}

const uploadImage = multer({
  storage: makeStorage(config.uploads.imagesDir),
  limits: { fileSize: config.uploads.maxImageBytes, files: 1 },
  fileFilter: makeFilter(IMAGE_MIME, IMAGE_EXT, 'JPG and PNG image'),
});

const uploadAudio = multer({
  storage: makeStorage(config.uploads.tracksDir),
  limits: { fileSize: config.uploads.maxAudioBytes, files: 1 },
  fileFilter: makeFilter(AUDIO_MIME, AUDIO_EXT, 'MP3 and WAV audio'),
});

/**
 * Track upload takes an audio file plus an optional cover image, so it needs a
 * combined storage/filter pair that routes each field to the right folder.
 */
const uploadTrackBundle = multer({
  storage: config.uploads.toCloudinary
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, file, cb) =>
          cb(null, file.fieldname === 'audio' ? config.uploads.tracksDir : config.uploads.imagesDir),
        filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
      }),
  limits: { fileSize: config.uploads.maxAudioBytes, files: 2 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'audio') {
      if (AUDIO_MIME.has(file.mimetype) && AUDIO_EXT.has(ext)) return cb(null, true);
      return cb(ApiError.unsupportedMedia('Only MP3 and WAV audio files are accepted'));
    }
    if (file.fieldname === 'cover') {
      if (!IMAGE_MIME.has(file.mimetype) || !IMAGE_EXT.has(ext)) {
        return cb(ApiError.unsupportedMedia('Cover art must be a JPG or PNG image'));
      }
      /**
       * multer's `limits.fileSize` is per REQUEST, not per field, so the 25 MB
       * audio ceiling was also letting a 24 MB JPEG through as cover art —
       * while the standalone image route refused anything over 5 MB. Same
       * asset, two different rules. Content-Length is what we have at filter
       * time; the request cap still catches anything that lies about it.
       */
      const declared = Number.parseInt(_req.headers['content-length'], 10) || 0;
      if (declared && declared > config.uploads.maxAudioBytes + config.uploads.maxImageBytes) {
        return cb(ApiError.payloadTooLarge('That cover image is too large'));
      }
      return cb(null, true);
    }
    return cb(ApiError.badRequest(`Unexpected file field "${file.fieldname}"`));
  },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

/** True for the audio half of a track upload, whichever storage is in use. */
function isAudio(file) {
  if (file.fieldname === 'audio') return true;
  if (file.destination) return file.destination === config.uploads.tracksDir;
  return AUDIO_MIME.has(file.mimetype);
}

/**
 * The public URL for an uploaded file.
 *
 * Disk storage returns a site-relative `/uploads/...` path; Cloudinary returns
 * an absolute https URL. The client's `mediaUrl()` already passes anything
 * starting with http(s):// straight through, so both shapes render with no
 * front-end change at all.
 *
 * Async because the Cloudinary upload happens here — multer has only put the
 * bytes in memory by this point.
 */
async function publicUrl(file) {
  if (!file) return null;
  const folder = isAudio(file) ? 'tracks' : 'images';

  if (config.uploads.toCloudinary) {
    return uploadBuffer(file.buffer, {
      folder,
      resourceType: folder === 'tracks' ? 'video' : 'image',
      filename: safeName(file.originalname),
    });
  }

  return `/uploads/${folder}/${file.filename}`;
}

module.exports = {
  uploadImage,
  uploadAudio,
  uploadTrackBundle,
  publicUrl,
  IMAGE_MIME,
  AUDIO_MIME,
};
