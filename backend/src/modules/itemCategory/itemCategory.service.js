const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const repo = require("./itemCategory.repository");

const ACCURATE_CATEGORY_LIST = "/item-category/list.do";

const getAll = async ({ page = 1, limit = 20, search } = {}) => {
  const [data, total] = await Promise.all([
    repo.findAll({ page, limit, search }),
    repo.count(search),
  ]);
  return { data, total, page: Number(page), limit: Number(limit) };
};

const syncFromAccurate = async () => {
  let page = 1;
  let pageCount = 1;
  let created = 0;
  let updated = 0;
  let failed = 0;

  do {
    const response = await accurateRequest(
      `${ACCURATE_CATEGORY_LIST}?fields=id,name&sp.page=${page}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API error on item-category page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    const categories = response.d ?? [];
    console.log(`SYNC ITEM CATEGORY PAGE: ${page}/${pageCount}, count: ${categories.length}`);

    for (const cat of categories) {
      if (!cat.id) { failed++; continue; }
      try {
        const accurateCategoryId = parseInt(cat.id, 10);
        const existing = await repo.findByAccurateId(accurateCategoryId);
        await repo.upsertFromAccurate(accurateCategoryId, cat.name || "Unknown");
        if (existing) { updated++; } else { created++; }
      } catch (_err) {
        console.error("CATEGORY SYNC ERROR:", cat.id, _err.message);
        failed++;
      }
    }

    page++;
  } while (page <= pageCount);

  console.log("ITEM CATEGORY SYNC COMPLETE", { created, updated, failed });
  return { created, updated, failed };
};

module.exports = { getAll, syncFromAccurate };
