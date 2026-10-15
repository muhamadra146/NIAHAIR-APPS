const paginate = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  // Cap default 10, maksimum 2000 (cukup untuk dropdown seperti inventory/items)
  const limitNum = Math.min(2000, Math.max(1, parseInt(limit) || 10));
  return {
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    page: pageNum,
    limit: limitNum,
  };
};

// page/limit dinormalisasi sama seperti paginate() — "abc"/0 tidak menghasilkan null/Infinity
const paginationMeta = (total, page, limit) => {
  const { page: p, limit: l } = paginate(page, limit);
  return { total, page: p, limit: l, totalPages: Math.ceil(total / l) };
};

module.exports = { paginate, paginationMeta };
