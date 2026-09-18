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

const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

module.exports = { paginate, paginationMeta };
