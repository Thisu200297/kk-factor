const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: 255,
    },
    slug: { type: String, required: true, unique: true, trim: true },
    content: { type: String, required: [true, 'Content is required'] },
    excerpt: { type: String, default: null, maxlength: 500 },
    image_url: { type: String, default: null },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'A category is required'],
      index: true,
    },
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    published_at: { type: Date, default: null },
    /** Surfaces the article in the breaking-news ticker on the home page. */
    is_breaking: { type: Boolean, default: false, index: true },
    is_featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },

    /* --- Syndicated items ---------------------------------------------------
     * Stories pulled in from another publisher's feed. They live in the same
     * collection as the newsroom's own writing because they are listed,
     * searched and categorised identically — only their ending differs, and
     * `is_external` is what the client checks to send the reader onward to the
     * publisher instead of opening a page here.
     * --------------------------------------------------------------------- */
    is_external: { type: Boolean, default: false, index: true },
    /**
     * Whether we hold the whole article or only a teaser of it.
     *
     * This is what the client reads to decide where a headline leads. With
     * only an excerpt, sending a reader to a page here would show them two
     * paragraphs and a dead end, so the card opens the publisher's site.
     * With the publisher's written permission and NEWS_FULL_TEXT on, we hold
     * the article, and it opens here with the credit and the original link.
     */
    is_full_text: { type: Boolean, default: false },
    source_name: { type: String, default: null, trim: true, maxlength: 120 },
    /** Canonical link back to the publisher. Required reading for the reader. */
    source_url: { type: String, default: null, maxlength: 500 },
    /** The byline as the publisher gave it — not a user of this site. */
    source_author: { type: String, default: null, trim: true, maxlength: 160 },
    /**
     * The feed's own permanent id for the item. Deliberately has NO default:
     * see the index below — a stored null would make every locally written
     * article a duplicate of the last one.
     */
    external_guid: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Drives the "latest published first" feed.
articleSchema.index({ status: 1, published_at: -1 });
/**
 * There is deliberately NO text index here.
 *
 * Search uses a case-insensitive regex, because a text index only matches
 * whole indexed words — a reader looking for "coast" would not find
 * "coastal". An index the query planner never touches still costs write
 * throughput and storage on every insert, which on a free Atlas tier is worth
 * not paying. If search ever moves to $text scoring, add it back with it.
 */

/**
 * One row per feed item, enforced by the database rather than by the importer
 * remembering to check. Partial rather than sparse: a sparse index skips
 * documents missing the field, but any document that stored an explicit null
 * would still collide with the next one, and every hand-written article would.
 */
articleSchema.index(
  { external_guid: 1 },
  { unique: true, partialFilterExpression: { external_guid: { $type: 'string' } } }
);

/**
 * `category` and `author` are populated virtuals rather than stored fields, so
 * the JSON keeps both the raw `category_id` and the nested `category` object
 * the client already expects.
 */
articleSchema.virtual('category', {
  ref: 'Category',
  localField: 'category_id',
  foreignField: '_id',
  justOne: true,
});

articleSchema.virtual('author', {
  ref: 'User',
  localField: 'author_id',
  foreignField: '_id',
  justOne: true,
});

/** Stamp published_at the first time an article goes live. */
articleSchema.pre('save', async function stampPublished() {
  if (this.status === 'published' && !this.published_at) {
    this.published_at = new Date();
  }
});

articleSchema.plugin(serialize);

module.exports = mongoose.model('Article', articleSchema);
