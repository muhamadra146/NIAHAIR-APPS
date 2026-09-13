// ── Format tanggal DD/MM/YYYY (sama dengan pola modul lain) ──────────────────
const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// ── Perintah Stok Opname ──────────────────────────────────────────────────────
//
// Endpoint: stock-opname-order/save.do
// Dibuat saat opname di-POSTED di NIAHAIR.
// Tidak perlu detailItem — Perintah hanya header (tanggal, gudang, deskripsi).
const mapOpnameOrderToAccurate = (opname, accurateBranchId = null) => ({
  transDate:   formatDate(opname.createdAt),   // tanggal opname dibuat (bukan diposting)
  description: `Opname ${opname.opnameNo}`,
  warehouseId: opname.warehouse.accurateWarehouseId,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
});

// ── Hasil Stok Opname ─────────────────────────────────────────────────────────
//
// Endpoint: stock-opname-result/save.do
// HANYA item yang ada selisih (qtyDifference != 0) yang dikirim.
// Field "stockOpnameOrderId" adalah link ke Perintah (field name sesuai Accurate API).
// quantity = qtyActual (hasil hitung fisik), bukan selisih.
const mapOpnameResultToAccurate = (opname, accurateOrderId, itemsWithDiff, accurateBranchId = null) => ({
  transDate:           formatDate(opname.postedAt ?? opname.createdAt),
  description:         `Hasil Opname ${opname.opnameNo}`,
  stockOpnameOrderId:  accurateOrderId,          // ← link ke Perintah
  warehouseId:         opname.warehouse.accurateWarehouseId,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailItem: itemsWithDiff.map((item) => ({
    itemId:   item.inventory.item.accurateItemId,
    quantity: Number(item.qtyActual ?? item.qtySystem),  // qty hasil hitung fisik
    unitId:   item.inventory.item.defaultUnit?.accurateUnitId,
  })),
});

module.exports = { mapOpnameOrderToAccurate, mapOpnameResultToAccurate };
