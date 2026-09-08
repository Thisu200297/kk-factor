const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

const radioStreamSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Station name is required'], trim: true, maxlength: 150 },
    /** Icecast / SHOUTcast endpoint consumed directly by the HTML5 Audio element. */
    stream_url: {
      type: String,
      required: [true, 'Stream URL is required'],
      match: [/^https?:\/\/.+/i, 'stream_url must be a valid http(s) URL'],
    },
    genre: { type: String, default: null, trim: true, maxlength: 80 },
    description: { type: String, default: null, maxlength: 400 },
    logo_url: { type: String, default: null },
    is_live: { type: Boolean, default: true, index: true },
    /** Optional Icecast status-json endpoint used for "Now Playing" metadata. */
    metadata_url: { type: String, default: null },
    display_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

radioStreamSchema.plugin(serialize);

module.exports = mongoose.model('RadioStream', radioStreamSchema);
