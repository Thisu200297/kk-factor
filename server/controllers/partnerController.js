const { Partner } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizePlain } = require('../utils/sanitize');

/** Shapes an incoming body into model fields, ignoring anything not sent. */
function fieldsFrom(body, { partial = false } = {}) {
  const out = {};
  const set = (key, value) => {
    if (!partial || value !== undefined) out[key] = value;
  };

  if (body.name !== undefined || !partial) set('name', sanitizePlain(body.name));
  if (body.kind !== undefined) out.kind = body.kind;
  if (body.logoUrl !== undefined) out.logo_url = body.logoUrl || null;
  if (body.websiteUrl !== undefined) out.website_url = body.websiteUrl || null;
  if (body.phone !== undefined) out.phone = sanitizePlain(body.phone) || null;
  if (body.email !== undefined) out.email = sanitizePlain(body.email) || null;
  if (body.description !== undefined) out.description = sanitizePlain(body.description) || null;
  if (body.displayOrder !== undefined) out.display_order = body.displayOrder;
  if (body.isActive !== undefined) out.is_active = Boolean(body.isActive);

  return out;
}

/**
 * GET /api/partners?kind=sponsor
 *
 * Public, and the strip across the top of every page reads it, so it must stay
 * cheap: one indexed query, no populate, no counts.
 */
const listPartners = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.kind) filter.kind = req.query.kind;
  // Only an admin has any reason to see the ones switched off.
  if (req.user?.role !== 'admin') filter.is_active = true;

  const items = await Partner.find(filter).sort({ display_order: 1, name: 1 });
  return res.json({ success: true, data: { items } });
});

/** GET /api/partners/:id */
const getPartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id);
  if (!partner) throw ApiError.notFound('Partner not found');
  return res.json({ success: true, data: { partner } });
});

/** POST /api/partners (admin) */
const createPartner = asyncHandler(async (req, res) => {
  const partner = await Partner.create({
    ...fieldsFrom(req.body),
    kind: req.body.kind || 'sponsor',
    display_order: req.body.displayOrder ?? 0,
    is_active: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
  });
  return res.status(201).json({ success: true, data: { partner } });
});

/** PUT /api/partners/:id (admin) */
const updatePartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id);
  if (!partner) throw ApiError.notFound('Partner not found');

  Object.assign(partner, fieldsFrom(req.body, { partial: true }));
  await partner.save();

  return res.json({ success: true, data: { partner } });
});

/** DELETE /api/partners/:id (admin) */
const deletePartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findByIdAndDelete(req.params.id);
  if (!partner) throw ApiError.notFound('Partner not found');
  return res.json({ success: true, data: { message: 'Partner removed', id: req.params.id } });
});

/**
 * PUT /api/partners/reorder (admin)
 * Body: { ids: [...] } in the order they should appear.
 *
 * The dashboard reorders by dragging, which moves several rows at once. Doing
 * it as one bulk write means the strip never renders half-reordered.
 */
const reorderPartners = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) throw ApiError.badRequest('Send the ids in their new order');

  await Partner.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { display_order: index } } },
    }))
  );

  const items = await Partner.find({ _id: { $in: ids } }).sort({ display_order: 1 });
  return res.json({ success: true, data: { items } });
});

/**
 * POST /api/partners/:id/click
 *
 * Fire and forget from the browser. Sponsors pay for the placement and will
 * ask what it did for them; this is the cheapest honest answer.
 */
const registerClick = asyncHandler(async (req, res) => {
  const partner = await Partner.findByIdAndUpdate(
    req.params.id,
    { $inc: { clicks: 1 } },
    { returnDocument: 'after' }
  );
  if (!partner) throw ApiError.notFound('Partner not found');
  return res.json({ success: true, data: { id: String(partner._id), clicks: partner.clicks } });
});

module.exports = {
  listPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
  reorderPartners,
  registerClick,
};
