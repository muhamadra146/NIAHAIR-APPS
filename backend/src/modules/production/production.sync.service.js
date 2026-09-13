// ── Accurate Sync — Production Order ──────────────────────────────────────────
//
// Alur 2 dokumen di Accurate Online:
//   1. Pekerjaan Pesanan      → /job-order/save.do
//      (job order produksi + daftar material yang akan dikonsumsi)
//   2. Penyesuaian Persediaan → /item-adjustment/save.do  (QTY_INCREASE)
//      (masuk stok barang jadi — pengganti /finished-good-slip/save.do yang
//       tidak berhasil di akun Accurate ini)
//
// Idempotency:
//   - Jika accuratePekerjaanId sudah ada → skip Pekerjaan, lanjut ke Penyelesaian
//   - Jika accuratePenyelesaianId sudah ada → skip Penyelesaian, return skipped
//
const { accurateRequest }                     = require("../accurate/accurate.client");
const { getAccurateBranchId }                 = require("../branch/branch.repository");
const { mapPekerjaanToAccurate,
        mapPenyelesaianToAccurate }           = require("./production.sync.mapper");
const {
  findProductionForSync,
  markPekerjaanSynced,
  markPenyelesaianSynced,
} = require("./production.sync.repository");

const ACCURATE_PEKERJAAN_SAVE    = "/job-order/save.do";
// /finished-good-slip/save.do tidak berhasil di akun ini → pakai item-adjustment
const ACCURATE_PENYELESAIAN_SAVE = "/item-adjustment/save.do";

// ── Langkah 1: Buat Pekerjaan Pesanan ────────────────────────────────────────
const syncPekerjaanToAccurate = async (order, accurateBranchId) => {
  // Idempotency: sudah ada → return ID yang ada
  if (order.accuratePekerjaanId) {
    console.log(`[production sync] Pekerjaan already synced id=${order.accuratePekerjaanId}`);
    return order.accuratePekerjaanId;
  }

  // Validasi setiap material
  for (const mat of order.materials) {
    if (!mat.item?.accurateItemId) {
      throw new Error(
        `Material belum terhubung ke Accurate: ${mat.item?.itemCode ?? mat.id}. Sync item terlebih dahulu.`,
      );
    }
    if (!mat.unit?.accurateUnitId) {
      throw new Error(
        `Satuan material belum terhubung ke Accurate: ${mat.item?.itemCode ?? mat.id}.`,
      );
    }
    if (!mat.warehouse?.accurateWarehouseId) {
      throw new Error(
        `Gudang material belum terhubung ke Accurate: ${mat.warehouse?.name ?? mat.id}.`,
      );
    }
  }

  const payload = mapPekerjaanToAccurate(order, accurateBranchId);
  console.log("[production sync] Pekerjaan payload", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_PEKERJAAN_SAVE, {
    method: "POST",
    body:   payload,
  });

  console.log("[production sync] Pekerjaan response", JSON.stringify(response));

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error (Pekerjaan Pesanan): ${JSON.stringify(response)}`);
  }

  const accuratePekerjaanId     = response.r.id;
  const accuratePekerjaanNumber = response.r.number ?? response.r.no ?? null;

  await markPekerjaanSynced({ id: order.id, accuratePekerjaanId, accuratePekerjaanNumber });
  console.log(`[production sync] Pekerjaan saved id=${accuratePekerjaanId} number=${accuratePekerjaanNumber}`);

  return accuratePekerjaanId;
};

// ── Langkah 2: Buat Finished Good Slip (Penyelesaian Pesanan) ────────────────
const syncPenyelesaianToAccurate = async (order, accuratePekerjaanId, accurateBranchId) => {
  // Idempotency: sudah ada → skip
  if (order.accuratePenyelesaianId) {
    console.log(`[production sync] Penyelesaian already synced id=${order.accuratePenyelesaianId}`);
    return { skipped: true, reason: "Penyelesaian already synced" };
  }

  // Validasi setiap finished goods item
  for (const pItem of order.items) {
    if (!pItem.item?.accurateItemId) {
      throw new Error(
        `Finished goods belum terhubung ke Accurate: ${pItem.item?.itemCode ?? pItem.id}. Sync item terlebih dahulu.`,
      );
    }
    if (!pItem.unit?.accurateUnitId) {
      throw new Error(
        `Satuan finished goods belum terhubung ke Accurate: ${pItem.item?.itemCode ?? pItem.id}.`,
      );
    }
  }

  if (!order.warehouse?.accurateWarehouseId) {
    throw new Error(
      `Gudang produksi "${order.warehouse?.name}" belum terhubung ke Accurate.`,
    );
  }

  const payload = mapPenyelesaianToAccurate(order, accuratePekerjaanId, accurateBranchId);
  console.log("[production sync] Penyelesaian payload", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_PENYELESAIAN_SAVE, {
    method: "POST",
    body:   payload,
  });

  console.log("[production sync] Penyelesaian response", JSON.stringify(response));

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error (Penyelesaian Pesanan): ${JSON.stringify(response)}`);
  }

  const accuratePenyelesaianId     = response.r.id;
  const accuratePenyelesaianNumber = response.r.number ?? response.r.no ?? null;

  await markPenyelesaianSynced({ id: order.id, accuratePenyelesaianId, accuratePenyelesaianNumber });
  console.log(`[production sync] Penyelesaian saved id=${accuratePenyelesaianId} number=${accuratePenyelesaianNumber}`);

  return { accuratePenyelesaianId, accuratePenyelesaianNumber };
};

// ── Entry point — dipanggil dari service (manual + auto) ─────────────────────
const syncProductionToAccurate = async (productionOrderId) => {
  const order = await findProductionForSync(productionOrderId);
  if (!order) throw new Error(`Production order tidak ditemukan: ${productionOrderId}`);

  if (order.status !== "COMPLETED") {
    throw new Error(
      `Production order harus berstatus COMPLETED sebelum sync ke Accurate, status saat ini: ${order.status}`,
    );
  }

  if (!order.warehouse?.accurateWarehouseId) {
    throw new Error(
      `Gudang "${order.warehouse?.name}" belum terhubung ke Accurate. Hubungkan gudang terlebih dahulu.`,
    );
  }

  if (!order.materials?.length) {
    throw new Error("Production order tidak memiliki material untuk di-sync.");
  }

  if (!order.items?.length) {
    throw new Error("Production order tidak memiliki finished goods untuk di-sync.");
  }

  const accurateBranchId = order.warehouse?.branchId
    ? await getAccurateBranchId(order.warehouse.branchId)
    : null;

  // Step 1 — Pekerjaan Pesanan (raw materials)
  const pekerjaanId = await syncPekerjaanToAccurate(order, accurateBranchId);

  // Step 2 — Penyelesaian Pesanan (finished goods)
  const penyelesaianResult = await syncPenyelesaianToAccurate(order, pekerjaanId, accurateBranchId);

  return { pekerjaanId, penyelesaianResult };
};

module.exports = { syncProductionToAccurate };
