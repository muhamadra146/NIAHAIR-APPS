'use strict';

const { StatusCodes }              = require("http-status-codes");
const AppError                     = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { accurateRequest }          = require("../accurate/accurate.client");
const { mapAccurateToSupplier }    = require("./supplier.sync.mapper");
const {
  findByAccurateId,
  createFromAccurate,
  updateByAccurateId,
  findAllActive,
  countActive,
} = require("./supplier.sync.repository");

const ACCURATE_VENDOR_LIST = "/vendor/list.do";
const ACCURATE_FIELDS      = "id,no,name,email,mobilePhone,address1,inactive";

const syncSuppliersFromAccurate = async ({ accurateBranchId } = {}) => {
  let page      = 1;
  let pageCount = 1;
  let created   = 0;
  let updated   = 0;
  let failed    = 0;
  const processedIds = new Set();
  const branchFilter = accurateBranchId ? `&branchId=${accurateBranchId}` : "";

  do {
    const response = await accurateRequest(
      `${ACCURATE_VENDOR_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}${branchFilter}`
    );

    console.log(`[supplier sync] raw response s=${response.s} sp=${JSON.stringify(response.sp)} d_length=${response.d?.length}`);

    if (!response.s) {
      throw new AppError(
        `Accurate API error on vendors page ${page}: ${JSON.stringify(response)}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    const vendors = response.d ?? [];
    console.log(`[supplier sync] page ${page}/${pageCount} — ${vendors.length} records`);

    for (const item of vendors) {
      if (!item.id) { failed++; continue; }
      const accurateId = parseInt(item.id, 10);
      if (processedIds.has(accurateId)) continue;
      processedIds.add(accurateId);

      try {
        const mapped   = mapAccurateToSupplier(item);
        const existing = await findByAccurateId(accurateId);
        if (existing) {
          const { accurateVendorId, ...updateData } = mapped;
          await updateByAccurateId(accurateId, updateData);
          updated++;
        } else {
          await createFromAccurate(mapped);
          created++;
        }
      } catch (err) {
        console.error(`[supplier sync] error id=${item.id}`, err.message);
        failed++;
      }
    }

    page++;
  } while (page <= pageCount);

  console.log(`[supplier sync] done — created=${created} updated=${updated} failed=${failed}`);
  return { created, updated, failed };
};

const getSuppliers = async ({ page, limit } = {}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    findAllActive({ skip, take }),
    countActive(),
  ]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

module.exports = { syncSuppliersFromAccurate, getSuppliers };
