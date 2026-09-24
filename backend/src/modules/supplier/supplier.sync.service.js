'use strict';

const logger = require('../../utils/logger');
const { StatusCodes }              = require("http-status-codes");
const AppError                     = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { accurateRequest }          = require("../accurate/accurate.client");
const { mapAccurateToSupplier }    = require("./supplier.sync.mapper");
const {
  findByAccurateId,
  createFromAccurate,
  updateByAccurateId,
  findAll,
  count,
} = require("./supplier.sync.repository");

const ACCURATE_VENDOR_LIST   = "/vendor/list.do";
// Hanya field yang tersedia dari list endpoint (fields param bekerja tapi selektif).
// name,email,mobilePhone,id harus diminta eksplisit agar ter-return.
// lookupSubText berisi "email, HP:mobilePhone, Telp:businessPhone" — dipakai sebagai
// fallback businessPhone jika /vendor/detail.do gagal diakses.
const ACCURATE_LIST_FIELDS   = "id,name,email,mobilePhone,lookupSubText";
// /vendor/detail.do?id={id} — mengembalikan data lengkap vendor:
// vendorNo (kode), term (term bayar), defaultPurchaseDisc, website, workPhone,
// billStreet (alamat), suspended (status), fax, dll.
const ACCURATE_VENDOR_DETAIL = "/vendor/detail.do";

// Ekstrak nomor telepon bisnis dari lookupSubText Accurate
// Format: "email, HP:mobilePhone, Telp:businessPhone"
function extractTelpFromLookupText(lookupSubText) {
  if (!lookupSubText) return null;
  const match = lookupSubText.match(/Telp:(\S+)/);
  return match ? match[1].replace(/,$/, "") : null;
}

const syncSuppliersFromAccurate = async ({ accurateBranchId } = {}) => {
  let created   = 0;
  let updated   = 0;
  let failed    = 0;
  const processedIds = new Set();
  const branchFilter = accurateBranchId ? `&branchId=${accurateBranchId}` : "";

  // Phase 1: Kumpulkan semua vendor dari list endpoint (paginasi)
  let page      = 1;
  let pageCount = 1;
  const allListItems = [];

  do {
    const response = await accurateRequest(
      `${ACCURATE_VENDOR_LIST}?fields=${ACCURATE_LIST_FIELDS}&sp.page=${page}${branchFilter}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API error on vendors page ${page}: ${JSON.stringify(response)}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    allListItems.push(...(response.d ?? []));
    page++;
  } while (page <= pageCount);

  // Phase 2: Untuk tiap vendor, ambil detail via /vendor/detail.do
  // Pattern: jangan spread/replace item, assign field tertentu saja
  // (sama seperti pattern di item.sync.service.js)
  for (const listItem of allListItems) {
    if (!listItem.id) { failed++; continue; }
    const accurateId = parseInt(listItem.id, 10);
    if (processedIds.has(accurateId)) continue;
    processedIds.add(accurateId);

    try {
      const item = {
        ...listItem,
        // Business phone fallback dari lookupSubText jika detail tidak tersedia
        _businessPhoneFallback: extractTelpFromLookupText(listItem.lookupSubText),
      };

      try {
        const detailRes = await accurateRequest(`${ACCURATE_VENDOR_DETAIL}?id=${accurateId}`);
        if (detailRes.s && detailRes.d) {
          const d = detailRes.d;
          // Field names verified dari /vendor/detail.do response:
          item.no               = d.vendorNo;            // kode vendor
          item.address1         = d.billStreet;          // alamat billing
          item.inactive         = d.suspended;           // suspended=true → non-aktif
          item.creditTerms      = d.term;                // objek {id, name} term bayar
          item.purchaseDiscount = d.defaultPurchaseDisc; // diskon default pembelian
          item.website          = d.website;             // website
          item.businessNo       = d.workPhone;           // telepon bisnis
          item.fax              = d.fax;                 // fax (fallback telepon bisnis)
        }
      } catch (detailErr) {
        logger.warn(`[supplier sync] detail fetch failed id=${accurateId}:`, detailErr.message);
      }

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
      logger.error(`[supplier sync] error id=${listItem.id}`, err.message);
      failed++;
    }
  }

  logger.info(`[supplier sync] done — created=${created} updated=${updated} failed=${failed}`);
  return { created, updated, failed };
};

// Return semua supplier (aktif & non-aktif) dengan semua field, support search
const getSuppliers = async ({ page, limit, search } = {}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (search?.trim()) {
    where.OR = [
      { name:  { contains: search.trim(), mode: "insensitive" } },
      { code:  { contains: search.trim(), mode: "insensitive" } },
      { email: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([findAll({ skip, take, where }), count(where)]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

module.exports = { syncSuppliersFromAccurate, getSuppliers };
