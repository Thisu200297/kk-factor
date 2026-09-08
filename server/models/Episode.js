const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

/**
 * One episode of The KK Factor.
 *
 * The show goes out live on YouTube, and YouTube keeps the recording as an
 * ordinary video the moment the stream ends. So the archive on this site is
 * not something an editor has to build by hand — the importer reads the
 * channel's feed and an episode appears. `source` records which route it came
 * in by, because an episode uploaded as a file behaves differently in the
 * player from one that is watched on YouTube.
 */
const episodeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Episode title is required'],
      trim: true,
      maxlength: 300,
    },
    slug: { type: String, required: true, unique: true, trim: true },

    source: {
      type: String,
      enum: ['youtube', 'upload'],
      default: 'youtube',
      index: true,
    },

    /**
     * The YouTube video id. Unique, but only among episodes that have one —
     * an uploaded episode has no id at all, and a plain unique index would
     * treat every one of those as a duplicate of the last. The partial index
     * at the bottom of this file is what makes that work.
     */
    youtube_id: { type: String, trim: true },
    video_url: { type: String, default: null },
    thumbnail_url: { type: String, default: null },

    /** Set when an editor uploads the audio instead of pointing at YouTube. */
    audio_url: { type: String, default: null },

    description: { type: String, default: null, maxlength: 5000 },
    published_at: { type: Date, default: Date.now, index: true },

    /** Seconds. 0 means unknown — the channel feed does not carry a duration. */
    duration: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ['published', 'hidden'],
      default: 'published',
      index: true,
    },

    /**
     * Which listeners may play it. This is how the Premium / Normal split is
     * expressed without any payment system existing yet: an admin marks an
     * episode premium, and only users whose own tier is premium can open it.
     */
    tier: {
      type: String,
      enum: ['normal', 'premium'],
      default: 'normal',
      index: true,
    },

    /** Pins one episode to the top of the show page regardless of date. */
    is_featured: { type: Boolean, default: false },
    plays: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The show page: newest published episode first.
episodeSchema.index({ status: 1, published_at: -1 });

/**
 * Unique only where a youtube_id actually exists. `sparse: true` would not do
 * here: it skips documents missing the field, but an uploaded episode that
 * stored an explicit null would still collide with the next one.
 */
episodeSchema.index(
  { youtube_id: 1 },
  { unique: true, partialFilterExpression: { youtube_id: { $type: 'string' } } }
);

episodeSchema.plugin(serialize);

module.exports = mongoose.model('Episode', episodeSchema);
