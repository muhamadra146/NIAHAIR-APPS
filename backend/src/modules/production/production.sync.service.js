// ── Accurate Sync — Production Order ──────────────────────────────────────────
//
// Alur dokumen di Accurate Online (Produksi → Pekerjaan Pesanan):
//
//   1. Pekerjaan Pesanan → /job-order/save.do  (prefix JC)
//      Input: order.materials = BAHAN BAKU yang diproses.
//      Muncul di menu Produksi → Pekerjaan Pesanan.
//
//   2. Penyelesaian Pesanan → /roll-over/save.do  (prefix RO)
//      Input: order.items = BARANG JADI hasil produksi.
//      Link ke JC via jobOrderId.
//      Muncul di menu Produksi → Penyelesaian Pesanan.
//
// Constraint Accurate:
//   - Item di JC.detailItem dan RO.detailItem HARUS BERBEDA.
//     Accurate menolak jika ada item yang sama di kedua dokumen.
//   - Semua item harus berstatus AKTIF di Accurate.
//
// Idempotency:
//   - Jika accuratePekerjaanId sudah ada → skip JC, lanjut ke RO
//   - Jika accuratePenyelesaianId sudah ada → skip RO, return skipped
//
const { StatusCodes }                         = require("http-status-codes");
const AppError                                = require("../../common/errors/AppError");
const { accurateRequest }                     = require("../accurate/accurate.client");
const { getAccurateBranchId }                 = require("../branch/branch.repository");
const { mapPekerjaanToAccurate,
        mapPenyelesaianToAccurate }           = require("./production.sync.mapper");
const {
  findProductionForSync,
  markPekerjaanSynced,
  markPenyelesaianSynced,
} = require("./production.sync.repository");

// Ekstrak pesan error dari respons Accurate — bisa berupa array atau string
const extractAccurateError = (response) => {
  if (Array.isArray(response.d) && response.d.length > 0) return response.d.join("; ");
  if (typeof response.d === "string" && response.d)       return response.d;
  if (typeof response.m === "string" && response.m)       return response.m;
  return JSON.stringify(response);
};

const ACCURATE_PEKERJAAN_SAVE    = "/job-order/save.do";
const ACCURATE_PENYELESAIAN_SAVE = "/roll-over/save.do";
const ACCURATE_PEKERJAAN_DELETE    = "/job-order/delete.do";
const ACCURATE_PENYELESAIAN_DELETE = "/roll-over/delete.do";

// ── Langkah 1: Buat Pekerjaan Pesanan (Job Order / JC) ───────────────────────
const syncPekerjaanToAccurate = async (order, accurateBranchId) => {
  if (order.accuratePekerjaanId) {
    console.log(`[production sync] Pekerjaan already synced id=${order.accuratePekerjaanId}`);
    return order.accuratePekerjaanId;
  }

  // Validasi bahan baku (materials)
  if (!order.materials?.length) {
    throw new Error(
      "Production order tidak memiliki bahan baku untuk Pekerjaan Pesanan. " +
      "Tambahkan bahan baku (bukan barang jadi) di production order.",
    );
  }

  for (const mat of order.materials) {
    if (!mat.item?.accurateItemId) {
      throw new Error(
        `Bahan baku "${mat.item?.itemCode ?? mat.item?.name}" belum terhubung ke Accurate. ` +
        "Sync item terlebih dahulu.",
      );
    }
    if (!mat.unit?.accurateUnitId) {
      throw new Error(
        `Satuan bahan baku "${mat.item?.itemCode ?? mat.item?.name}" belum terhubung ke Accurate.`,
      );
    }
  }

  if (!order.warehouse?.accurateWarehouseId) {
    throw new Error(
      `Gudang "${order.warehouse?.name}" belum terhubung ke Accurate. ` +
      "Hubungkan gudang terlebih dahulu.",
    );
  }

  // Guard: pastikan item di materials BERBEDA dari items (barang jadi)
  // Jika sama, Accurate akan tolak RO nanti.
  const itemIds  = new Set((order.items ?? []).map((i) => i.item?.accurateItemId));
  const overlap  = (order.materials ?? []).filter((m) => itemIds.has(m.item?.accurateItemId));
  if (overlap.length > 0) {
    throw new Error(
      `Bahan baku dan barang jadi tidak boleh item yang sama di Accurate. ` +
      `Item bentrok: ${overlap.map((m) => m.item?.itemCode ?? m.item?.name).join(", ")}. ` +
      "Perbaiki data production order terlebih dahulu.",
    );
  }

  const payload = mapPekerjaanToAccurate(order, accurateBranchId);
  console.log("[production sync] Pekerjaan payload", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_PEKERJAAN_SAVE, {
    method: "POST",
    body:   payload,
  });

  console.log("[production sync] Pekerjaan response", JSON.stringify(response));

  if (!response.s || !response.r?.id) {
    throw new AppError(
      `Gagal membuat Pekerjaan Pesanan di Accurate: ${extractAccurateError(response)}`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const accuratePekerjaanId     = response.r.id;
  const accuratePekerjaanNumber = response.r.number ?? response.r.no ?? null;

  await markPekerjaanSynced({ id: order.id, accuratePekerjaanId, accuratePekerjaanNumber });
  console.log(`[production sync] Pekerjaan saved id=${accuratePekerjaanId} number=${accuratePekerjaanNumber}`);

  return accuratePekerjaanId;
};

// ── Langkah 2: Buat Penyelesaian Pesanan (Roll Over / RO) ─────────────────────
const syncPenyelesaianToAccurate = async (order, accuratePekerjaanId, accurateBranchId) => {
  if (order.accuratePenyelesaianId) {
    console.log(`[production sync] Penyelesaian already synced id=${order.accuratePenyelesaianId}`);
    return { skipped: true, reason: "Penyelesaian already synced" };
  }

  // Validasi barang jadi (items)
  for (const pItem of order.items) {
    if (!pItem.item?.accurateItemId) {
      throw new Error(
        `Barang jadi "${pItem.item?.itemCode ?? pItem.item?.name}" belum terhubung ke Accurate. ` +
        "Sync item terlebih dahulu.",
      );
    }
    if (!pItem.unit?.accurateUnitId) {
      throw new Error(
        `Satuan barang jadi "${pItem.item?.itemCode ?? pItem.item?.name}" belum terhubung ke Accurate.`,
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
    throw new AppError(
      `Gagal membuat Penyelesaian Pesanan di Accurate: ${extractAccurateError(response)}`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
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
      `Production order harus berstatus COMPLETED sebelum sync ke Accurate. ` +
      `Status saat ini: ${order.status}`,
    );
  }

  if (!order.warehouse?.accurateWarehouseId) {
    throw new Error(
      `Gudang "${order.warehouse?.name}" belum terhubung ke Accurate. ` +
      "Hubungkan gudang terlebih dahulu.",
    );
  }

  if (!order.materials?.length) {
    throw new Error(
      "Production order tidak memiliki bahan baku. " +
      "Tambahkan bahan baku (bukan barang jadi) sebelum sync.",
    );
  }

  if (!order.items?.length) {
    throw new Error("Production order tidak memiliki barang jadi untuk di-sync.");
  }

  // Validasi alokasi biaya: setiap item harus > 0 DAN total harus = 100
  // Gunakan toNumber() untuk Prisma.Decimal — lebih reliable dari Number() langsung.
  const toNum = (v) => (v && typeof v.toNumber === "function" ? v.toNumber() : parseFloat(String(v ?? "")) || 0);

  for (const item of order.items) {
    const alloc = toNum(item.costAllocationPercentage);
    if (alloc <= 0) {
      throw new AppError(
        `Alokasi biaya item "${item.item?.itemCode ?? item.item?.name}" adalah ${alloc}%. ` +
        `Setiap barang jadi harus memiliki alokasi > 0%. ` +
        `Hubungi admin untuk memperbaiki data production order ini.`,
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
  }

  const totalPercentage = order.items.reduce((sum, item) => sum + toNum(item.costAllocationPercentage), 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new AppError(
      `Alokasi biaya harus total 100%. Saat ini: ${totalPercentage.toFixed(2)}%. ` +
      `Perbaiki porsi alokasi biaya di production order sebelum sync ke Accurate.`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const accurateBranchId = order.warehouse?.branchId
    ? await getAccurateBranchId(order.warehouse.branchId)
    : null;

  // Step 1 — Pekerjaan Pesanan (JC) via /job-order/save.do
  // Input: order.materials (bahan baku)
  const pekerjaanId = await syncPekerjaanToAccurate(order, accurateBranchId);

  // Step 2 — Penyelesaian Pesanan (RO) via /roll-over/save.do
  // Input: order.items (barang jadi), link ke JC via jobOrderId
  const penyelesaianResult = await syncPenyelesaianToAccurate(order, pekerjaanId, accurateBranchId);

  return { pekerjaanId, penyelesaianResult };
};

// ── Delete dari Accurate: RO dulu, baru JC ────────────────────────────────────
//
// Urutan: hapus RO (Penyelesaian Pesanan) DULU sebelum JC (Pekerjaan Pesanan).
// Accurate menolak hapus JC jika masih ada RO yang terhubung.
//
// Best-effort: error dilog tapi tidak di-throw — caller memutuskan cara handle.
const deleteFromAccurate = async ({ accuratePekerjaanId, accuratePenyelesaianId }) => {
  // 1. Hapus Penyelesaian Pesanan (RO) terlebih dahulu
  if (accuratePenyelesaianId) {
    try {
      const resp = await accurateRequest(
        `${ACCURATE_PENYELESAIAN_DELETE}?id=${accuratePenyelesaianId}`,
        { method: "DELETE" },
      );
      if (!resp.s) {
        console.warn(
          `[production sync] Gagal hapus RO id=${accuratePenyelesaianId}: ${extractAccurateError(resp)}`,
        );
      } else {
        console.log(`[production sync] RO id=${accuratePenyelesaianId} dihapus dari Accurate`);
      }
    } catch (err) {
      console.warn(`[production sync] Error hapus RO id=${accuratePenyelesaianId}:`, err?.message);
    }
  }

  // 2. Hapus Pekerjaan Pesanan (JC)
  if (accuratePekerjaanId) {
    try {
      const resp = await accurateRequest(
        `${ACCURATE_PEKERJAAN_DELETE}?id=${accuratePekerjaanId}`,
        { method: "DELETE" },
      );
      if (!resp.s) {
        console.warn(
          `[production sync] Gagal hapus JC id=${accuratePekerjaanId}: ${extractAccurateError(resp)}`,
        );
      } else {
        console.log(`[production sync] JC id=${accuratePekerjaanId} dihapus dari Accurate`);
      }
    } catch (err) {
      console.warn(`[production sync] Error hapus JC id=${accuratePekerjaanId}:`, err?.message);
    }
  }
};

module.exports = { syncProductionToAccurate, deleteFromAccurate };
