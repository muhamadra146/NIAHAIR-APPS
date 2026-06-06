const { StatusCodes }   = require("http-status-codes");
const AppError          = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { upsertFromAccurate } = require("./warehouse.repository");

const ACCURATE_WAREHOUSE_LIST = "/warehouse/list.do";
// Request only the fields we use — less payload, faster response
const ACCURATE_FIELDS = "id,name,suspended";

const syncWarehousesFromAccurate = async () => {
  let page      = 1;
  let pageCount = 1;
  let created   = 0;
  let updated   = 0;
  let failed    = 0;

  const processedIds = new Set();

  do {
    const response = await accurateRequest(
      `${ACCURATE_WAREHOUSE_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API returned error on page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    const warehouses = response.d ?? [];

    console.log(`[accurate warehouse sync] page ${page}/${pageCount} — ${warehouses.length} items`);

    for (const item of warehouses) {
      if (!item.id) { failed++; continue; }

      const accurateId = parseInt(item.id, 10);
      if (processedIds.has(accurateId)) continue;
      processedIds.add(accurateId);

      try {
        const result = await upsertFromAccurate({
          accurateWarehouseId: accurateId,
          name:     item.name || `Warehouse ${accurateId}`,
          isActive: !item.suspended,
        });

        // upsert returns the row; if createdAt === updatedAt it was just created
        const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
        if (isNew) {
          created++;
          console.log(`[accurate warehouse sync] create accurateId=${accurateId} name="${result.name}"`);
        } else {
          updated++;
          console.log(`[accurate warehouse sync] update accurateId=${accurateId} name="${result.name}"`);
        }
      } catch (err) {
        console.error(`[accurate warehouse sync] failed accurateId=${accurateId}`, err.message);
        failed++;
      }
    }

    page++;
  } while (page <= pageCount);

  const total = created + updated + failed;
  console.log(`[accurate warehouse sync] done — created=${created} updated=${updated} failed=${failed} total=${total}`);

  return { created, updated, failed };
};

module.exports = { syncWarehousesFromAccurate };
