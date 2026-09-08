const { v2: cloudinary } = require('cloudinary');
const config = require('../config/env');

/**
 * Cloudinary reads CLOUDINARY_URL from the environment on its own, so there is
 * no key handling here. `secure` forces https URLs, which matters because the
 * page itself is served over https and a mixed-content image is blocked.
 */
if (config.uploads.toCloudinary) cloudinary.config({ secure: true });

const FOLDER = 'kk-factor';

/**
 * Streams a buffer to Cloudinary and resolves with the absolute https URL.
 *
 * Audio is uploaded as `video` — that is Cloudinary's resource type for any
 * media with a time axis, audio included. Sending an mp3 as `image` fails.
 */
function uploadBuffer(buffer, { folder, resourceType, filename }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${FOLDER}/${folder}`,
        resource_type: resourceType,
        public_id: filename.replace(/\.[^.]+$/, ''),
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Removes an asset we previously uploaded, given the URL stored in the
 * database. Cloudinary deletes by public_id rather than by URL, so the id is
 * read back out of the path: everything after the version segment, minus the
 * extension.
 *
 * Returns false rather than throwing. A delete that cannot tidy up its file is
 * still a successful delete as far as the person pressing the button is
 * concerned; the alternative is a record that refuses to go away because of a
 * housekeeping failure.
 */
async function destroyByUrl(url) {
  if (!config.uploads.toCloudinary || !url || !/res\.cloudinary\.com/.test(url)) return false;

  try {
    const match = /\/upload\/(?:v\d+\/)?(.+)$/.exec(url);
    if (!match) return false;

    const publicId = match[1].replace(/\.[^./]+$/, '');
    const resourceType = /\/video\/upload\//.test(url) ? 'video' : 'image';

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[cloudinary] Could not remove', url, '-', error.message);
    return false;
  }
}

module.exports = { uploadBuffer, destroyByUrl };
