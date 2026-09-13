// ── Accurate Sync — Stock Opname ──────────────────────────────────────────────
//
// Alur 2 dokumen di Accurate Online:
//   1. Perintah Stok Opname  → stock-opname-order/save.do
//   2. Hasil Stok Opname     → stock-opname-result/save.do
//      (hanya item yang ada selisih qtyDifference ≠ 0)
//
// Idempotency:
//   - Jika accurateOrderId sudah ada → skip Perintah, lanjut ke Hasil
//   - Jika accurateResultId sudah ada → skip Hasil, return skipped
//
const { accurateRequest }                     = require("../accurate/accurate.client");
const { getAccurateBranchId }                 = require("../branch/branch.repository");
const { mapOpnameOrderToAccurate,
        mapOpnameResultToAccurate }           = require("./stockOpname.sync.mapper");
const {
  findOpnameForSync,
  markOpnameOrderSynced,
  markOpnameResultSynced,
} = require("./stockOpname.sync.repository");

const ACCURATE_ORDER_SAVE  = "/stock-opname-order/save.do";
const ACCURATE_RESULT_SAVE = "/stock-opname-result/save.do";

// ── Langkah 1: Buat Perintah Stok Opname ─────────────────────────────────────
const syncOpnameOrderToAccurate = async (opname, accurateBranchId) => {
  // Idempotency: sudah ada → return ID yang ada
  if (opname.accurateOrderId) {
    console.log(`[opname sync] Perintah already synced orderId=${opname.accurateOrderId}`);
    return opname.accurateOrderId;
  }

  const payload = mapOpnameOrderToAccurate(opname, accurateBranchId);
  console.log("[opname sync] Perintah payload", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_ORDER_SAVE, {
    method: "POST",
    body:   payload,
  });

  console.log("[opname sync] Perintah response", JSON.stringify(response));

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error (Perintah SO): ${JSON.stringify(response)}`);
  }

  const accurateOrderId     = response.r.id;
  const accurateOrderNumber = response.r.number ?? response.r.no ?? null;

  await markOpnameOrderSynced({ id: opname.id, accurateOrderId, accurateOrderNumber });
  console.log(`[opname sync] Perintah saved orderId=${accurateOrderId} number=${accurateOrderNumber}`);

  return accurateOrderId;
};

// ── Langkah 2: Buat Hasil Stok Opname ────────────────────────────────────────
const syncOpnameResultToAccurate = async (opname, accurateOrderId, accurateBranchId) => {
  // Idempotency: sudah ada → skip
  if (opname.accurateResultId) {
    console.log(`[opname sync] Hasil already synced resultId=${opname.accurateResultId}`);
    return { skipped: true, reason: "Hasil already synced" };
  }

  // Hanya item yang ada selisih (qtyDifference != null && != 0)
  const itemsWithDiff = opname.items.filter((item) => {
    if (item.qtyDifference === null || item.qtyDifference === undefined) return false;
    return Number(item.qtyDifference) !== 0;
  });

  if (itemsWithDiff.length === 0) {
    console.log("[opname sync] Tidak ada item dengan selisih — Hasil SO tidak dibuat");
    return { skipped: true, reason: "No items with difference" };
  }

  // Validasi setiap item yang punya selisih
  for (const item of itemsWithDiff) {
    const it = item.inventory?.item;
    if (!it?.accurateItemId) {
      throw new Error(
        `Item belum terhubung ke Accurate: ${it?.itemCode ?? item.id}. Sync item terlebih dahulu.`
      );
    }
    if (!it?.defaultUnit?.accurateUnitId) {
      throw new Error(
        `Satuan item belum terhubung ke Accurate: ${it?.itemCode ?? item.id}. Sync satuan terlebih dahulu.`
      );
    }
  }

  const payload = mapOpnameResultToAccurate(opname, accurateOrderId, itemsWithDiff, accurateBranchId);
  console.log("[opname sync] Hasil payload", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_RESULT_SAVE, {
    method: "POST",
    body:   payload,
  });

  console.log("[opname sync] Hasil response", JSON.stringify(response));

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error (Hasil SO): ${JSON.stringify(response)}`);
  }

  const accurateResultId     = response.r.id;
  const accurateResultNumber = response.r.number ?? response.r.no ?? null;

  await markOpnameResultSynced({ id: opname.id, accurateResultId, accurateResultNumber });
  console.log(`[opname sync] Hasil saved resultId=${accurateResultId} number=${accurateResultNumber}`);

  return { accurateResultId, accurateResultNumber };
};

// ── Entry point — dipanggil dari service ─────────────────────────────────────
const syncOpnameToAccurate = async (opnameId) => {
  const opname = await findOpnameForSync(opnameId);
  if (!opname) throw new Error(`Stock opname not found: ${opnameId}`);

  if (opname.status !== "POSTED") {
    throw new Error(
      `Opname harus berstatus POSTED sebelum sync ke Accurate, status saat ini: ${opname.status}`
    );
  }

  if (!opname.warehouse?.accurateWarehouseId) {
    throw new Error(
      `Gudang "${opname.warehouse?.name}" belum terhubung ke Accurate. Hubungkan gudang terlebih dahulu.`
    );
  }

  const accurateBranchId = opname.warehouse?.branchId
    ? await getAccurateBranchId(opname.warehouse.branchId)
    : null;

  // Step 1 — Perintah SO
  const accurateOrderId = await syncOpnameOrderToAccurate(opname, accurateBranchId);

  // Step 2 — Hasil SO (hanya jika ada selisih)
  const hasilResult = await syncOpnameResultToAccurate(opname, accurateOrderId, accurateBranchId);

  return { accurateOrderId, hasilResult };
};

module.exports = { syncOpnameToAccurate };
