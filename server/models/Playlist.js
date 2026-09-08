const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Playlist name is required'], trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: null, maxlength: 400 },
    cover_url: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    is_public: { type: Boolean, default: true },
    /**
     * Play order IS the array order. Under SQL this needed a join table with a
     * `position` column; an ordered array of references expresses the same
     * thing directly, which is one of the places the document model is a
     * better fit for this data.
     */
    track_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

playlistSchema.virtual('owner', {
  ref: 'User',
  localField: 'created_by',
  foreignField: '_id',
  justOne: true,
});

playlistSchema.plugin(serialize);

module.exports = mongoose.model('Playlist', playlistSchema);
