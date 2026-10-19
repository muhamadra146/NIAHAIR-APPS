const { wibDateStr } = require("../../utils/date");

// ── Format tanggal DD/MM/YYYY menurut kalender WIB ───────────────────────────
const formatDate = (date) => {
  const [yyyy, mm, dd] = wibDateStr(date).split("-");
  return `${dd}/${mm}/${yyyy}`;
};

// ── Hasil Stok Opname → Penyesuaian Persediaan (Item Adjustment) ────────────
//
// Keputusan owner 2026-10-19: hasil opname dikirim ke Accurate sebagai SATU dokumen
// Penyesuaian Persediaan (/item-adjustment/save.do — jalur yang sama dengan penyesuaian
// stok manual), BUKAN Perintah/Hasil Stok Opname (Perintah mengunci seluruh gudang di
// Accurate dan user API tidak berhak membuat Hasil Stok Opname).
//
// Hanya baris yang punya movement penyesuaian (selisih ≠ 0). Qty = |qtyChange| movement
// (satuan dasar), arah per baris: ADJUSTMENT_IN (lebih) / ADJUSTMENT_OUT (kurang).
// lines: Array<{ movement: { qtyChange }, item: { accurateItemId, defaultUnit }, unitCostPrice }>
const mapOpnameToItemAdjustment = (opname, lines, { accurateGlAccountId, accurateBranchId = null }) => ({
  transDate:   formatDate(opname.postedAt ?? opname.createdAt),
  description: `Stok Opname ${opname.opnameNo}`,
  // Nama field Accurate untuk akun penyesuaian = adjustmentAccountId (glAccountId diabaikan Accurate
  // dan dokumen jatuh ke akun default) — terverifikasi lewat detail.do 2026-10-19
  adjustmentAccountId: accurateGlAccountId,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailItem: lines.map((line) => ({
    itemId:             line.item.accurateItemId,
    quantity:           Math.abs(Number(line.movement.qtyChange)),
    unitId:             line.item.defaultUnit.accurateUnitId,
    unitPrice:          line.unitCostPrice ?? 0,
    warehouseId:        opname.warehouse.accurateWarehouseId,
    itemAdjustmentType: Number(line.movement.qtyChange) >= 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
  })),
});

module.exports = { mapOpnameToItemAdjustment };
