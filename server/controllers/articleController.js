const { Article, Category } = require('../models');
const { removeAsset } = require('../utils/media');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slugify');
const { sanitizePlain, sanitizeRichText } = require('../utils/sanitize');
const { getPagination, paginatedResponse } = require('../utils/pagination');

/** Nested category and author, matching the shape the client expects. */
const POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'author', select: 'name avatar_url' },
];

/** Matches a 24-character hex ObjectId, so a slug is never cast as an id. */
const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

/** Non-admins may only ever see published articles. */
function visibilityFilter(req, extra = {}) {
  const isAdmin = req.user?.role === 'admin';
  if (isAdmin && req.query.status) return { ...extra, status: req.query.status };
  if (isAdmin && req.query.includeDrafts === 'true') return extra;
  return { ...extra, status: 'published' };
}

/** Derives an excerpt from the body when the editor did not supply one. */
function deriveExcerpt(excerpt, content) {
  if (excerpt) return sanitizePlain(excerpt).slice(0, 500);
  const text = String(content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 200) + (text.length > 200 ? '…' : '');
}

/** GET /api/articles */
const listArticles = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const filter = visibilityFilter(req);

  if (req.query.featured === 'true') filter.is_featured = true;
  if (req.query.breaking === 'true') filter.is_breaking = true;

  const [rows, count] = await Promise.all([
    Article.find(filter)
      .populate(POPULATE)
      .sort({ published_at: -1, created_at: -1 })
      .skip(offset)
      .limit(limit),
    Article.countDocuments(filter),
  ]);

  return res.json({ success: true, data: paginatedResponse({ count, rows }, page, limit) });
});

/** GET /api/articles/:id — accepts an id or a slug. */
const getArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const identifier = isObjectId(id) ? { _id: id } : { slug: id };

  const article = await Article.findOne(identifier).populate(POPULATE);
  if (!article) throw ApiError.notFound('Article not found');
  if (article.status !== 'published' && req.user?.role !== 'admin') {
    throw ApiError.notFound('Article not found');
  }

  // Fire-and-forget view counter; a failure here must not break the read.
  Article.updateOne({ _id: article._id }, { $inc: { views: 1 } }).catch(() => {});

  const related = await Article.find({
    category_id: article.category_id,
    _id: { $ne: article._id },
    status: 'published',
  })
    .populate(POPULATE)
    .sort({ published_at: -1 })
    .limit(4);

  return res.json({ success: true, data: { article, related } });
});

/** GET /api/articles/category/:category — id or slug. */
const getByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const identifier = isObjectId(category) ? { _id: category } : { slug: category };

  const found = await Category.findOne(identifier);
  if (!found) throw ApiError.notFound('Category not found');

  const { page, limit, offset } = getPagination(req.query);
  const filter = visibilityFilter(req, { category_id: found._id });

  const [rows, count] = await Promise.all([
    Article.find(filter).populate(POPULATE).sort({ published_at: -1 }).skip(offset).limit(limit),
    Article.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: { category: found, ...paginatedResponse({ count, rows }, page, limit) },
  });
});

/** Escapes user input before it goes into a RegExp. */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** GET /api/search?q= — matches title, excerpt and body. */
const searchArticles = asyncHandler(async (req, res) => {
  const q = String(req.query.q).trim();
  const { page, limit, offset } = getPagination(req.query);

  // A case-insensitive regex keeps parity with the previous LIKE '%term%'
  // behaviour: a text index would only match whole indexed words, so a search
  // for "coast" would miss "coastal".
  const pattern = new RegExp(escapeRegex(q), 'i');
  const filter = {
    status: 'published',
    $or: [{ title: pattern }, { excerpt: pattern }, { content: pattern }],
  };

  const [rows, count] = await Promise.all([
    Article.find(filter).populate(POPULATE).sort({ published_at: -1 }).skip(offset).limit(limit),
    Article.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: { query: q, ...paginatedResponse({ count, rows }, page, limit) },
  });
});

/** POST /api/articles (admin) */
const createArticle = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.categoryId).catch(() => null);
  if (!category) throw ApiError.badRequest('Selected category does not exist');

  const title = sanitizePlain(req.body.title);
  const content = sanitizeRichText(req.body.content);

  const article = await Article.create({
    title,
    slug: await uniqueSlug(Article, title),
    content,
    excerpt: deriveExcerpt(req.body.excerpt, content),
    image_url: req.body.imageUrl || null,
    category_id: category._id,
    author_id: req.user._id,
    status: req.body.status || 'draft',
    is_breaking: Boolean(req.body.isBreaking),
    is_featured: Boolean(req.body.isFeatured),
  });

  const created = await Article.findById(article._id).populate(POPULATE);
  return res.status(201).json({ success: true, data: { article: created } });
});

/** PUT /api/articles/:id (admin) */
const updateArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw ApiError.notFound('Article not found');

  if (req.body.categoryId) {
    const category = await Category.findById(req.body.categoryId).catch(() => null);
    if (!category) throw ApiError.badRequest('Selected category does not exist');
    article.category_id = category._id;
  }

  if (req.body.title !== undefined) {
    article.title = sanitizePlain(req.body.title);
    article.slug = await uniqueSlug(Article, article.title, article._id);
  }
  if (req.body.content !== undefined) article.content = sanitizeRichText(req.body.content);
  if (req.body.excerpt !== undefined) article.excerpt = deriveExcerpt(req.body.excerpt, article.content);
  if (req.body.imageUrl !== undefined) article.image_url = req.body.imageUrl || null;
  if (req.body.status !== undefined) article.status = req.body.status;
  if (req.body.isBreaking !== undefined) article.is_breaking = Boolean(req.body.isBreaking);
  if (req.body.isFeatured !== undefined) article.is_featured = Boolean(req.body.isFeatured);

  await article.save();
  const updated = await Article.findById(article._id).populate(POPULATE);
  return res.json({ success: true, data: { article: updated } });
});

/** DELETE /api/articles/:id (admin) */
const deleteArticle = asyncHandler(async (req, res) => {
  const article = await Article.findByIdAndDelete(req.params.id);
  if (!article) throw ApiError.notFound('Article not found');

  /**
   * An imported story's picture belongs to the publisher and lives on their
   * server; only a cover somebody uploaded here is ours to remove.
   */
  if (!article.is_external) await removeAsset(article.image_url);

  return res.json({ success: true, data: { message: 'Article deleted', id: req.params.id } });
});

/** GET /api/articles/stats/overview (admin) — powers the dashboard tiles. */
const articleStats = asyncHandler(async (_req, res) => {
  const [total, published, drafts, topViewed] = await Promise.all([
    Article.countDocuments(),
    Article.countDocuments({ status: 'published' }),
    Article.countDocuments({ status: 'draft' }),
    Article.find().select('title slug views').sort({ views: -1 }).limit(5),
  ]);
  return res.json({ success: true, data: { total, published, drafts, topViewed } });
});

/** GET /api/articles/trending — most-viewed published articles. */
const trending = asyncHandler(async (_req, res) => {
  const items = await Article.find({ status: 'published' })
    .populate(POPULATE)
    .sort({ views: -1, published_at: -1 })
    .limit(6);
  return res.json({ success: true, data: { items } });
});

module.exports = {
  listArticles,
  getArticle,
  getByCategory,
  searchArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  articleStats,
  trending,
};
