const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

const trackSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Track title is required'], trim: true, maxlength: 200 },
    artist: { type: String, default: 'Unknown Artist', trim: true, maxlength: 200, index: true },
    album: { type: String, default: null, trim: true, maxlength: 200 },
    /** Public path served by the API, e.g. /uploads/tracks/162...-song.mp3 */
    file_url: { type: String, required: true },
    cover_url: { type: String, default: null },
    /** Seconds. 0 means "unknown" — the client falls back to audio metadata. */
    duration: { type: Number, default: 0, min: 0 },
    genre: { type: String, default: null, trim: true, maxlength: 80, index: true },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    plays: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

trackSchema.virtual('uploader', {
  ref: 'User',
  localField: 'uploaded_by',
  foreignField: '_id',
  justOne: true,
});

trackSchema.plugin(serialize);

module.exports = mongoose.model('Track', trackSchema);
