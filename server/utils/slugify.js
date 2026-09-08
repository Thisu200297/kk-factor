/** URL-safe slug: "Breaking: KK Factor Launches!" -> "breaking-kk-factor-launches" */
function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/**
 * Produces a slug guaranteed unique within `Model`, appending -2, -3, ...
 * `excludeId` lets an update keep its own slug.
 */
async function uniqueSlug(Model, source, excludeId = null) {
  const base = slugify(source) || `item-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const where = { slug: candidate };
    if (excludeId) where._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const clash = await Model.exists(where);
    if (!clash) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

module.exports = { slugify, uniqueSlug };
