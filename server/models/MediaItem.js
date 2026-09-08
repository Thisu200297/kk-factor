const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

/**
 * One item in the media gallery — a photograph from an event, or a video.
 *
 * Videos are stored as a YouTube id rather than a file. A gallery of two-hour
 * recordings would exhaust a free storage tier in a fortnight, and YouTube
 * already hosts everything she films; keeping the id means the gallery costs
 * nothing to run and still plays.
 */
const mediaItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'A title is required'], trim: true, maxlength: 200 },
    kind: { type: String, enum: ['photo', 'video'], default: 'photo', index: true },

    /** The photograph itself, or the poster frame for a video. */
    image_url: { type: String, default: null },
    /** Set for kind: 'video'. */
    youtube_id: { type: String, default: null, trim: true },

    caption: { type: String, default: null, maxlength: 500 },
    /** When it was taken, which is rarely when it was uploaded. */
    taken_at: { type: Date, default: null },

    display_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The gallery page: what is showing, in the order she arranged it.
mediaItemSchema.index({ is_active: 1, display_order: 1 });

/** Poster frame for a video, when nobody uploaded one. */
mediaItemSchema.virtual('poster_url').get(function posterUrl() {
  if (this.image_url) return this.image_url;
  if (this.youtube_id) return `https://i.ytimg.com/vi/${this.youtube_id}/hqdefault.jpg`;
  return null;
});

mediaItemSchema.plugin(serialize);

module.exports = mongoose.model('MediaItem', mediaItemSchema);
