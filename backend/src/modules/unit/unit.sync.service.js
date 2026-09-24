const logger = require('../../utils/logger');
const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { mapAccurateToUnit } = require("./unit.sync.mapper");
const { findByAccurateId, createFromAccurate, updateByAccurateId } = require("./unit.sync.repository");

const ACCURATE_UNIT_LIST = "/unit/list.do";
const ACCURATE_FIELDS = "id,name,suspended";

const syncUnitsFromAccurate = async () => {
  let page = 1;
  let pageCount = 1;
  let accurateRowCount = 0;

  // Counters — each represents a real action, never estimated.
  let created = 0;
  let updated = 0;
  let skippedDuplicate = 0;
  let failed = 0;
  let active = 0;
  let inactive = 0;

  // Collect every raw ID returned by Accurate across all pages.
  const accurateIds = [];

  // Track which IDs have already been processed in this run.
  // Prevents the same Accurate unit from being written twice when
  // the API returns duplicate IDs across page boundaries.
  const processedIds = new Set();

  do {
    const response = await accurateRequest(
      `${ACCURATE_UNIT_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API returned error on page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    accurateRowCount = response.sp?.rowCount ?? 0;

    const units = response.d ?? [];
    logger.info("SYNC ACCURATE UNIT PAGE:", page, "/", pageCount);
    logger.info("FIRST UNIT ID:", units[0]?.id);

    for (const item of units) {
      accurateIds.push(item.id);

      if (!item.id) {
        failed++;
        continue;
      }

      const accurateId = parseInt(item.id, 10);

      if (processedIds.has(accurateId)) {
        logger.info("SKIP DUPLICATE:", accurateId);
        skippedDuplicate++;
        continue;
      }
      processedIds.add(accurateId);

      try {
        const mapped = mapAccurateToUnit(item);

        if (mapped.isActive) {
          active++;
        } else {
          inactive++;
        }

        const existing = await findByAccurateId(accurateId);

        if (existing) {
          logger.info("UPDATE:", accurateId, existing.id);
          const { accurateUnitId, ...updateData } = mapped;
          await updateByAccurateId(accurateId, updateData);
          updated++;
        } else {
          logger.info("CREATE:", accurateId);
          await createFromAccurate(mapped);
          created++;
        }
      } catch (_err) {
        logger.error("UNIT SYNC ERROR:", accurateId, _err.message);
        failed++;
      }
    }

    page++;
  } while (page <= pageCount);

  // Duplicate ID analysis
  const uniqueAccurateIds = new Set(accurateIds.filter(Boolean));
  logger.info({
    totalFromAccurate: accurateIds.length,
    uniqueFromAccurate: uniqueAccurateIds.size,
    duplicate: accurateIds.length - uniqueAccurateIds.size,
  });

  if (accurateIds.length !== uniqueAccurateIds.size) {
    const frequency = {};
    for (const id of accurateIds) {
      if (id) frequency[id] = (frequency[id] || 0) + 1;
    }
    const duplicateIds = Object.entries(frequency)
      .filter(([, c]) => c > 1)
      .map(([id, c]) => ({ id: Number(id), count: c }));
    logger.info("DUPLICATE IDs:", duplicateIds);
  }

  const totalProcessed = created + updated + skippedDuplicate + failed;
  logger.info("SYNC COMPLETE", {
    accurateRowCount,
    uniqueIds: processedIds.size,
    created,
    updated,
    skippedDuplicate,
    failed,
    active,
    inactive,
    totalProcessed,
  });

  return { created, updated, skippedDuplicate, failed, active, inactive };
};

module.exports = { syncUnitsFromAccurate };
