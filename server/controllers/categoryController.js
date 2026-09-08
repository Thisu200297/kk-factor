const { Category, Article } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slugify');
const { sanitizePlain } = require('../utils/sanitize');

/** GET /api/categories — includes a published-article count for the nav tabs. */
const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ display_order: 1, name: 1 });

  const counts = await Article.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category_id', count: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(counts.map((row) => [String(row._id), row.count]));

  return res.json({
    success: true,
    data: {
      items: categories.map((c) => ({ ...c.toJSON(), articleCount: byId[String(c._id)] || 0 })),
    },
  });
});

/** POST /api/categories (admin) */
const createCategory = asyncHandler(async (req, res) => {
  const name = sanitizePlain(req.body.name);
  const category = await Category.create({
    name,
    slug: await uniqueSlug(Category, name),
    description: sanitizePlain(req.body.description) || null,
    display_order: req.body.displayOrder ?? 0,
  });
  return res.status(201).json({ success: true, data: { category } });
});

/** PUT /api/categories/:id (admin) */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  if (req.body.name !== undefined) {
    category.name = sanitizePlain(req.body.name);
    category.slug = await uniqueSlug(Category, category.name, category._id);
  }
  if (req.body.description !== undefined) category.description = sanitizePlain(req.body.description) || null;
  if (req.body.displayOrder !== undefined) category.display_order = req.body.displayOrder;

  await category.save();
  return res.json({ success: true, data: { category } });
});

/**
 * DELETE /api/categories/:id (admin)
 *
 * Under MySQL a foreign key refused this automatically. MongoDB has no such
 * constraint, so the same guarantee is enforced here — without it, deleting a
 * category would silently orphan every article pointing at it.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const inUse = await Article.countDocuments({ category_id: category._id });
  if (inUse > 0) {
    throw ApiError.conflict(`Cannot delete: ${inUse} article(s) still use this category`);
  }

  await category.deleteOne();
  return res.json({ success: true, data: { message: 'Category deleted', id: String(category._id) } });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
