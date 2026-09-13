// ── Format tanggal DD/MM/YYYY (sama dengan pola modul lain) ──────────────────
const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// ── Pekerjaan Pesanan ─────────────────────────────────────────────────────────
//
// Endpoint: /job-order/save.do
// Dibuat saat produksi di-COMPLETED di NIAHAIR.
// Merepresentasikan raw material yang dikonsumsi (PRODUCTION OUT).
// detailItem → setiap material dengan accurateItemId.
const mapPekerjaanToAccurate = (order, accurateBranchId = null) => ({
  transDate:   formatDate(order.actualStartAt ?? order.productionDate),
  description: `Produksi ${order.productionNo}`,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailItem: order.materials.map((mat) => ({
    itemId:      mat.item.accurateItemId,
    quantity:    Number(mat.actualQuantity ?? mat.plannedQuantity),
    unitId:      mat.unit.accurateUnitId,
    warehouseId: mat.warehouse.accurateWarehouseId,
  })),
});

// ── Penyesuaian Persediaan / Item Adjustment (pengganti Penyelesaian Pesanan) ──
//
// Endpoint: /item-adjustment/save.do
// Dibuat setelah Pekerjaan Pesanan berhasil disync.
// Merepresentasikan barang jadi yang dihasilkan masuk ke stok (PRODUCTION IN).
// adjustType: QTY_INCREASE → tambah stok barang jadi.
//
// Catatan: /finished-good-slip/save.do tidak berhasil di akun Accurate ini
// ("Perintah Kerja tidak ditemukan atau sudah dihapus" walaupun ID valid).
// /item-adjustment/save.do terbukti berhasil dan menghasilkan response.r.id
// yang bisa disimpan sebagai accuratePenyelesaianId.
const mapPenyelesaianToAccurate = (order, _accuratePekerjaanId, accurateBranchId = null) => ({
  transDate:   formatDate(order.actualFinishAt ?? order.productionDate),
  description: `Penyelesaian ${order.productionNo}`,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailItem: order.items.map((pItem) => ({
    itemId:      pItem.item.accurateItemId,
    quantity:    Number(pItem.producedQuantity ?? pItem.plannedQuantity),
    unitId:      pItem.unit.accurateUnitId,
    warehouseId: order.warehouse.accurateWarehouseId,
    adjustType:  "QTY_INCREASE",
  })),
});

module.exports = { mapPekerjaanToAccurate, mapPenyelesaianToAccurate };
