const { StatusCodes }   = require("http-status-codes");
const AppError          = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { mapItemDetailToWarehouseStocks } = require("./inventory.sync.mapper");
const {
  findWarehousesForSync,
  findItemByAccurateId,
  syncInventoryQuantity,
} = require("./inventory.sync.repository");

// list.do — only for pagination; does NOT return stock qty per warehouse
const ACCURATE_ITEM_LIST   = "/item/list.do";
const ACCURATE_ITEM_DETAIL = "/item/detail.do";

// Request warehouse stock fields from detail.do.
// detailWarehouseItem is the most likely field name in Accurate Online;
// the debug log of the first item will confirm the actual field names.
const ACCURATE_DETAIL_FIELDS = "id,no,detailWarehouseItem";

// ── Main sync ─────────────────────────────────────────────────────────

const syncInventoryFromAccurate = async () => {
  console.log("[inventory sync] start");

  const warehouses = await findWarehousesForSync();

  if (warehouses.length === 0) {
    console.log("[inventory sync] no warehouses with Accurate mapping — nothing to do");
    return { warehousesProcessed: 0, itemsUpdated: 0, skipped: 0 };
  }

  // Build lookup once: accurateWarehouseId (Int) → local warehouse object
  const warehouseMap = new Map(
    warehouses.map((w) => [w.accurateWarehouseId, w])
  );

  console.log(
    `[inventory sync] mapped warehouses: ${warehouses.map((w) => `${w.name}(${w.accurateWarehouseId})`).join(", ")}`
  );

  let itemsUpdated = 0;
  let skipped      = 0;
  let page         = 1;
  let pageCount    = 1;
  let firstItem    = true;   // flag for the debug log — fires once per sync run

  do {
    const listRes = await accurateRequest(
      `${ACCURATE_ITEM_LIST}?fields=id&sp.page=${page}`
    );

    if (!listRes.s) {
      throw new AppError(
        `Accurate API error on item list page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount    = listRes.sp?.pageCount ?? 1;
    const items  = listRes.d ?? [];

    console.log(`[inventory sync] list.do page=${page}/${pageCount} count=${items.length}`);

    for (const item of items) {
      if (!item.id) { skipped++; continue; }

      const accurateItemId = parseInt(item.id, 10);

      // Skip items that haven't been synced locally or are SERVICE type
      const localItem = await findItemByAccurateId(accurateItemId);
      if (!localItem) { skipped++; continue; }
      if (localItem.itemType !== "INVENTORY") { skipped++; continue; }

      try {
        // Fetch full detail — list.do does not include warehouse stock
        const detailRes = await accurateRequest(
          `${ACCURATE_ITEM_DETAIL}?id=${item.id}&fields=${ACCURATE_DETAIL_FIELDS}`
        );

        if (!detailRes.s || !detailRes.d) {
          console.error(`[inventory sync] detail.do failed id=${item.id}`);
          skipped++;
          continue;
        }

        // ── Temporary debug: log the first item's full detail response ────────
        // Remove this block once field names are confirmed.
        if (firstItem) {
          firstItem = false;
          console.log(
            "[inventory sync] DEBUG first item/detail.do response:\n" +
            JSON.stringify(detailRes.d, null, 2)
          );
        }
        // ─────────────────────────────────────────────────────────────────────

        const warehouseStocks = mapItemDetailToWarehouseStocks(detailRes.d);

        for (const { accurateWarehouseId, quantity } of warehouseStocks) {
          const localWarehouse = warehouseMap.get(accurateWarehouseId);
          if (!localWarehouse) continue;   // warehouse not mapped locally

          const { changed } = await syncInventoryQuantity({
            warehouseId: localWarehouse.id,
            itemId:      localItem.id,
            accurateQty: quantity,
          });

          if (changed) {
            console.log(
              `[inventory sync] updated ${localItem.itemCode}` +
              ` warehouse=${localWarehouse.name} qty=${quantity}`
            );
            itemsUpdated++;
          }
        }
      } catch (err) {
        console.error(
          `[inventory sync] failed item=${localItem.itemCode}`,
          err.message
        );
        skipped++;
      }
    }

    page++;
  } while (page <= pageCount);

  console.log(
    `[inventory sync] done —` +
    ` warehousesProcessed=${warehouses.length}` +
    ` itemsUpdated=${itemsUpdated}` +
    ` skipped=${skipped}`
  );

  return { warehousesProcessed: warehouses.length, itemsUpdated, skipped };
};

module.exports = { syncInventoryFromAccurate };
