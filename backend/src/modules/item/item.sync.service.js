const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { mapAccurateToItem } = require("./item.sync.mapper");
const {
  findByAccurateId,
  createFromAccurate,
  updateByAccurateId,
  findUnitByAccurateId,
  upsertItemUnit,
  findActiveGlobalPrice,
  deactivatePriceById,
  createItemPrice,
} = require("./item.sync.repository");

const ACCURATE_ITEM_LIST   = "/item/list.do";
const ACCURATE_ITEM_DETAIL = "/item/detail.do";
// unit1–unit5 carry unit objects; ratio2–ratio5 are conversion factors relative to unit1.
// detailSellingPrice is NOT returned by list.do — fetched per-item via detail.do.
const ACCURATE_FIELDS =
  "id,name,no,itemType,suspended," +
  "unit1,unit2,unit3,unit4,unit5," +
  "ratio2,ratio3,ratio4,ratio5";
const ACCURATE_DETAIL_FIELDS = "detailSellingPrice";

// ── Helpers ───────────────────────────────────────────────────────────

// Sync global price (branchId = null) for one item + unit.
// Same price → skip (no write). Changed → deactivate old row, insert new (price history).
// costPrice is not available from detailSellingPrice — stored as null.
const syncItemPrice = async (itemId, unitId, sellingPrice) => {
  if (sellingPrice == null) return;
  const newSelling = Number(sellingPrice);

  const existing = await findActiveGlobalPrice(itemId, unitId);
  if (existing) {
    if (Number(existing.sellingPrice) === newSelling) return;
    await deactivatePriceById(existing.id);
  }

  await createItemPrice({
    itemId,
    unitId,
    branchId:      null,
    sellingPrice:  newSelling,
    costPrice:     null,
    effectiveDate: new Date(),
    isActive:      true,
  });
};

// Upsert item_units and item_prices for all units attached to an Accurate item.
//
// Unit source:  unit1–unit5 with ratio2–ratio5 (unit1 is always conversionFactor=1).
// Price source: detailSellingPrice[] — each entry has { unit: { id }, price }.
//               Prices are NEVER derived or calculated — only written when Accurate
//               explicitly sends a price for that unit.
//
// If a unit from unit1–unit5 is not found locally:
//   log a warning and skip — units must be synced first via POST /units/sync/accurate.
const syncItemUnitsAndPrices = async (itemId, accurateItem) => {
  // Ordered unit entries from Accurate's fixed fields
  const unitEntries = [
    { unit: accurateItem.unit1, factor: 1,                   isDefault: true  },
    { unit: accurateItem.unit2, factor: accurateItem.ratio2, isDefault: false },
    { unit: accurateItem.unit3, factor: accurateItem.ratio3, isDefault: false },
    { unit: accurateItem.unit4, factor: accurateItem.ratio4, isDefault: false },
    { unit: accurateItem.unit5, factor: accurateItem.ratio5, isDefault: false },
  ].filter(e => e.unit?.id);

  // Build price lookup keyed by Accurate unit ID
  const priceMap = {};
  for (const p of accurateItem.detailSellingPrice ?? []) {
    if (p.unit?.id && p.price != null) {
      priceMap[parseInt(p.unit.id, 10)] = Number(p.price);
    }
  }

  for (const { unit, factor, isDefault } of unitEntries) {
    try {
      const accurateUnitId = parseInt(unit.id, 10);

      // Units must already exist — item sync does NOT create units
      const localUnit = await findUnitByAccurateId(accurateUnitId);
      if (!localUnit) {
        console.error(`UNIT NOT FOUND (run /units/sync/accurate first): id=${accurateUnitId} name=${unit.name}`);
        continue;
      }

      await upsertItemUnit(itemId, localUnit.id, Number(factor ?? 1), isDefault);

      // Only write a price row when Accurate explicitly provides one
      const price = priceMap[accurateUnitId];
      if (price != null) {
        await syncItemPrice(itemId, localUnit.id, price);
      }
    } catch (_err) {
      console.error("ITEM UNIT/PRICE SYNC ERROR:", unit?.id, _err.message);
    }
  }
};

// ── Main sync ─────────────────────────────────────────────────────────

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

    pageCount        = response.sp?.pageCount ?? 1;
    accurateRowCount = response.sp?.rowCount   ?? 0;

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
        // detailSellingPrice is not returned by list.do — fetch it per-item from detail.do
        try {
          const detailRes = await accurateRequest(
            `${ACCURATE_ITEM_DETAIL}?id=${item.id}&fields=${ACCURATE_DETAIL_FIELDS}`
          );
          if (detailRes.s && detailRes.d?.detailSellingPrice) {
            item.detailSellingPrice = detailRes.d.detailSellingPrice;
          }
        } catch (_detailErr) {
          console.error("ITEM DETAIL FETCH ERROR:", item.id, _detailErr.message);
        }

        // Resolve defaultUnitId from unit1 BEFORE mapping so the item row
        // always carries a valid FK to the local units table.
        let defaultUnitId = null;
        if (item.unit1?.id) {
          const localUnit = await findUnitByAccurateId(parseInt(item.unit1.id, 10));
          defaultUnitId = localUnit?.id ?? null;
        }

        const mapped = mapAccurateToItem(item, defaultUnitId);

        // Track active/inactive before any DB write so counts are honest
        // even if the write fails.
        if (mapped.isActive) {
          active++;
        } else {
          inactive++;
        }

        const existing = await findByAccurateId(accurateId);
        let localItemId;

        if (existing) {
          console.log("UPDATE:", accurateId, existing.id);
          const { accurateItemId, ...updateData } = mapped;
          await updateByAccurateId(accurateId, updateData);
          localItemId = existing.id;
          updated++;
        } else {
          console.log("CREATE:", accurateId);
          const result = await createFromAccurate(mapped);
          localItemId = result.id;
          created++;
        }

        // Sync item_units and item_prices for all units in a single pass
        await syncItemUnitsAndPrices(localItemId, item);
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
