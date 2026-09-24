const logger = require('../../utils/logger');
const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { accurateRequest } = require("../accurate/accurate.client");
const repo = require("./itemCategory.repository");

const ACCURATE_CATEGORY_LIST = "/item-category/list.do";

const getAll = async ({ page, limit, search } = {}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    repo.findAll({ skip, take, search }),
    repo.count(search),
  ]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// Two-pass sync:
//   Pass 1 — upsert every category flat (no parentId) so all rows exist in DB
//   Pass 2 — resolve parentId for subcategories using their parent.id from Accurate
const syncFromAccurate = async () => {
  let page     = 1;
  let pageCount = 1;
  let created  = 0;
  let updated  = 0;
  let failed   = 0;

  // ── Collect all categories from Accurate ───────────────────────────────
  const all = [];
  do {
    const response = await accurateRequest(
      `${ACCURATE_CATEGORY_LIST}?fields=id,name,parent&sp.page=${page}&sp.pageSize=50`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API error on item-category page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    const batch = response.d ?? [];
    logger.info(`SYNC ITEM CATEGORY FETCH PAGE: ${page}/${pageCount}, count: ${batch.length}`);
    all.push(...batch);
    page++;
  } while (page <= pageCount);

  // ── Pass 1: upsert all categories without parentId ─────────────────────
  logger.info(`SYNC ITEM CATEGORY PASS 1: upsert ${all.length} categories flat`);
  for (const cat of all) {
    if (!cat.id) { failed++; continue; }
    try {
      const accurateCategoryId = parseInt(cat.id, 10);
      const existing = await repo.findByAccurateId(accurateCategoryId);
      await repo.upsertFromAccurate(accurateCategoryId, cat.name || "Unknown", null);
      if (existing) { updated++; } else { created++; }
    } catch (err) {
      logger.error("CATEGORY SYNC PASS1 ERROR:", cat.id, err.message);
      failed++;
    }
  }

  // ── Pass 2: resolve parentId for subcategories ─────────────────────────
  const subcategories = all.filter((c) => c.parent?.id);
  logger.info(`SYNC ITEM CATEGORY PASS 2: link ${subcategories.length} subcategories to parents`);

  for (const cat of subcategories) {
    try {
      const parentAccurateId = parseInt(cat.parent.id, 10);
      const childAccurateId  = parseInt(cat.id, 10);

      const parentRow = await repo.findByAccurateId(parentAccurateId);
      if (!parentRow) {
        logger.warn(`CATEGORY PARENT NOT FOUND: accurateId=${parentAccurateId}`);
        continue;
      }

      await repo.setParent(childAccurateId, parentRow.id);
    } catch (err) {
      logger.error("CATEGORY SYNC PASS2 ERROR:", cat.id, err.message);
      failed++;
    }
  }

  logger.info("ITEM CATEGORY SYNC COMPLETE", { created, updated, failed });
  return { created, updated, failed };
};

module.exports = { getAll, syncFromAccurate };
