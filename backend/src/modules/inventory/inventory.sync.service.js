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

// "detailWarehouseData" adalah field yang benar di Accurate untuk stok per gudang.
// (bukan "detailWarehouseItem" — field tersebut tidak ada di Accurate API)
const ACCURATE_DETAIL_FIELDS = "detailWarehouseData";

// Jumlah item yang diproses secara paralel per batch.
// 10 paralel = ~72 batch untuk 715 item ≈ ~1 menit vs 12 menit serial.
const BATCH_CONCURRENCY = 10;

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

  // ── Step 1: Kumpulkan semua item INVENTORY dari semua halaman list.do ─
  const inventoryItems = []; // [{ accurateItemId, localItem }]

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

    pageCount   = listRes.sp?.pageCount ?? 1;
    const items = listRes.d ?? [];

    console.log(`[inventory sync] list.do page=${page}/${pageCount} count=${items.length}`);

    for (const item of items) {
      if (!item.id) { skipped++; continue; }

      const accurateItemId = parseInt(item.id, 10);
      const localItem      = await findItemByAccurateId(accurateItemId);

      if (!localItem)                          { skipped++; continue; }
      if (localItem.itemType !== "INVENTORY")  { skipped++; continue; }

      inventoryItems.push({ accurateId: item.id, localItem });
    }

    page++;
  } while (page <= pageCount);

  console.log(`[inventory sync] INVENTORY items to process: ${inventoryItems.length} (skipped so far: ${skipped})`);

  // ── Step 2: Proses paralel dengan batching (BATCH_CONCURRENCY item sekaligus) ─
  // Setiap item memanggil detail.do untuk mendapatkan stok per gudang.

  const processItem = async ({ accurateId, localItem }) => {
    try {
      const detailRes = await accurateRequest(
        `${ACCURATE_ITEM_DETAIL}?id=${accurateId}&fields=${ACCURATE_DETAIL_FIELDS}`
      );

      if (!detailRes.s || !detailRes.d) {
        console.error(`[inventory sync] detail.do failed id=${accurateId} item=${localItem.itemCode}`);
        return { updated: 0, skipped: 1 };
      }

      const warehouseStocks = mapItemDetailToWarehouseStocks(detailRes.d);
      let updated = 0;

      for (const { accurateWarehouseId, quantity } of warehouseStocks) {
        const localWarehouse = warehouseMap.get(accurateWarehouseId);
        if (!localWarehouse) continue;

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
          updated++;
        }
      }

      return { updated, skipped: 0 };
    } catch (err) {
      console.error(`[inventory sync] failed item=${localItem.itemCode}`, err.message);
      return { updated: 0, skipped: 1 };
    }
  };

  // Proses dalam batch BATCH_CONCURRENCY item sekaligus
  for (let i = 0; i < inventoryItems.length; i += BATCH_CONCURRENCY) {
    const batch   = inventoryItems.slice(i, i + BATCH_CONCURRENCY);
    const results = await Promise.all(batch.map(processItem));

    for (const r of results) {
      itemsUpdated += r.updated;
      skipped      += r.skipped;
    }

    console.log(
      `[inventory sync] batch ${Math.floor(i / BATCH_CONCURRENCY) + 1}/` +
      `${Math.ceil(inventoryItems.length / BATCH_CONCURRENCY)}` +
      ` updated=${itemsUpdated} skipped=${skipped}`
    );
  }

  console.log(
    `[inventory sync] done —` +
    ` warehousesProcessed=${warehouses.length}` +
    ` itemsUpdated=${itemsUpdated}` +
    ` skipped=${skipped}`
  );

  return { warehousesProcessed: warehouses.length, itemsUpdated, skipped };
};

module.exports = { syncInventoryFromAccurate };
