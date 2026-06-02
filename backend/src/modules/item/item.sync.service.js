const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { mapAccurateToItem } = require("./item.sync.mapper");
const { findByAccurateId, createFromAccurate, updateByAccurateId } = require("./item.sync.repository");

const ACCURATE_ITEM_LIST = "/item/list.do";
const ACCURATE_FIELDS = "id,name,no,itemType,suspended";

const syncItemsFromAccurate = async () => {
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
  // Prevents the same Accurate item from being written twice when
  // the API returns duplicate IDs across page boundaries.
  const processedIds = new Set();

  do {
    const response = await accurateRequest(
      `${ACCURATE_ITEM_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API returned error on page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    accurateRowCount = response.sp?.rowCount ?? 0;

    const items = response.d ?? [];
    console.log("SYNC ACCURATE ITEM PAGE:", page, "/", pageCount);
    console.log("FIRST ITEM ID:", items[0]?.id);

    for (const item of items) {
      accurateIds.push(item.id);

      if (!item.id) {
        failed++;
        continue;
      }

      const accurateId = parseInt(item.id, 10);

      if (processedIds.has(accurateId)) {
        console.log("SKIP DUPLICATE:", accurateId);
        skippedDuplicate++;
        continue;
      }
      processedIds.add(accurateId);

      try {
        const mapped = mapAccurateToItem(item);

        // Track active/inactive before any DB write so counts are honest
        // even if the write fails.
        if (mapped.isActive) {
          active++;
        } else {
          inactive++;
        }

        const existing = await findByAccurateId(accurateId);

        if (existing) {
          console.log("UPDATE:", accurateId, existing.id);
          const { accurateItemId, ...updateData } = mapped;
          await updateByAccurateId(accurateId, updateData);
          updated++;
        } else {
          console.log("CREATE:", accurateId);
          await createFromAccurate(mapped);
          created++;
        }
      } catch (_err) {
        console.error("ITEM SYNC ERROR:", accurateId, _err.message);
        failed++;
      }
    }

    page++;
  } while (page <= pageCount);

  // Duplicate ID analysis
  const uniqueAccurateIds = new Set(accurateIds.filter(Boolean));
  console.log({
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
    console.log("DUPLICATE IDs:", duplicateIds);
  }

  const totalProcessed = created + updated + skippedDuplicate + failed;
  console.log("SYNC COMPLETE", {
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

module.exports = { syncItemsFromAccurate };
