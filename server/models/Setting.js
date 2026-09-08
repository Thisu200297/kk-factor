const mongoose = require('mongoose');

/**
 * A very small key/value store for things that are settings rather than
 * content — the state of the "we are live" banner, and whatever site-wide
 * switches follow it.
 *
 * The alternative was a Site document with a growing column per feature, which
 * means a schema change and a deploy every time the client wants one more
 * toggle. A key/value row is a write.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    value: { type: mongoose.Schema.Types.Mixed, default: null },

    /**
     * Whether the browser may read it without signing in. Off by default, so a
     * setting added later cannot leak by being forgotten about.
     */
    is_public: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

settingSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

/** Reads one value, or `fallback` when it has never been set. */
settingSchema.statics.read = async function read(key, fallback = null) {
  const row = await this.findOne({ key });
  return row ? row.value : fallback;
};

/** Writes one value, creating the row if needed. */
settingSchema.statics.write = async function write(key, value, { isPublic = false } = {}) {
  return this.findOneAndUpdate(
    { key },
    { $set: { value }, $setOnInsert: { key, is_public: isPublic } },
    { returnDocument: 'after', upsert: true }
  );
};

module.exports = mongoose.model('Setting', settingSchema);
