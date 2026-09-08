/** Normalises ?page= and ?limit= into safe Mongoose skip/limit values. */
function getPagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requested = Number.parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(1, requested), maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

/** Wraps rows in a consistent envelope so the client can drive pagers. */
function paginatedResponse({ count, rows }, page, limit) {
  return {
    items: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
      hasNext: page * limit < count,
      hasPrev: page > 1,
    },
  };
}

module.exports = { getPagination, paginatedResponse };
