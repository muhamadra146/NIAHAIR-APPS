// ── Format tanggal DD/MM/YYYY (sama dengan pola modul lain) ──────────────────
const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// ── Pekerjaan Pesanan / Job Order ─────────────────────────────────────────────
//
// Endpoint: /job-order/save.do → prefix JC
//
// Merepresentasikan ORDER PRODUKSI yang menyebutkan bahan baku yang akan diproses.
//   detailItem = MATERIALS / BAHAN BAKU (BUKAN barang jadi!)
//   itemUnitId = field satuan di JC endpoint (beda dengan IA yang pakai unitId)
//
// Alur Accurate production module:
//   JC (bahan baku masuk) → RO (barang jadi keluar)
//   Item di JC dan RO HARUS berbeda — Accurate menolak jika sama.
//
// Dikonfirmasi dari test PROD-0002:
//   JC: ZOA 6-11 (bahan baku) → RO: ALMOST HITAM 25CM NEW (barang jadi)
const mapPekerjaanToAccurate = (order, accurateBranchId = null) => ({
  transDate:   formatDate(order.actualStartAt ?? order.productionDate),
  description: `Pekerjaan Pesanan ${order.productionNo}`,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailItem: order.materials.map((mat) => ({
    itemId:      mat.item.accurateItemId,
    quantity:    Number(mat.actualQuantity ?? mat.plannedQuantity),
    itemUnitId:  mat.unit.accurateUnitId,   // itemUnitId — field di JC endpoint
    warehouseId: mat.warehouse?.accurateWarehouseId ?? order.warehouse.accurateWarehouseId,
  })),
});

// ── Penyelesaian Pesanan / Roll Over ──────────────────────────────────────────
//
// Endpoint: /roll-over/save.do → prefix RO
//
// Merepresentasikan hasil produksi — barang jadi yang diselesaikan dari JC.
// Muncul di menu Produksi → Penyelesaian Pesanan di Accurate Online.
//
// Field kritis:
//   jobOrderId  = ID dari JC yang sudah dibuat (wajib, RO selalu link ke JC)
//   detailItem  = BARANG JADI (bukan bahan baku!)
//   unitId      = field satuan di RO endpoint (beda dengan JC yang pakai itemUnitId)
//   portion     = porsi alokasi biaya (100 = full) — BUKAN "percentage"!
//                 Dikonfirmasi dari GET /roll-over/detail.do: field-nya "portion", bukan "percentage".
//                 Accurate menolak RO dengan error "porsi alokasi belum 100%" jika field salah nama.
//
// Constraint Accurate:
//   Item di RO.detailItem HARUS BERBEDA dari item di JC.detailItem.
//   Jika sama, Accurate akan error: "Barang ini merupakan bahan baku JC"
const mapPenyelesaianToAccurate = (order, accuratePekerjaanId, accurateBranchId = null) => ({
  transDate:   formatDate(order.actualFinishAt ?? order.productionDate),
  description: `Penyelesaian Pesanan ${order.productionNo}`,
  jobOrderId:  accuratePekerjaanId,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailItem: order.items.map((pItem) => ({
    itemId:      pItem.item.accurateItemId,
    quantity:    Number(pItem.producedQuantity ?? pItem.plannedQuantity),
    unitId:      pItem.unit.accurateUnitId,   // unitId — field di RO endpoint
    warehouseId: order.warehouse.accurateWarehouseId,
    // "portion" adalah nama field yang benar di Accurate untuk alokasi biaya RO.
    // Dikonfirmasi via GET /roll-over/detail.do — bukan "percentage".
    // Prisma.Decimal: pakai toNumber() jika tersedia, fallback ke parseFloat(toString()).
    portion: pItem.costAllocationPercentage && typeof pItem.costAllocationPercentage.toNumber === "function"
      ? pItem.costAllocationPercentage.toNumber()
      : parseFloat(String(pItem.costAllocationPercentage ?? "100")) || 100,
  })),
});

module.exports = { mapPekerjaanToAccurate, mapPenyelesaianToAccurate };
