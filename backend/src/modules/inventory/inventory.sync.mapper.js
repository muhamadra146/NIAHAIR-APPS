/**
 * Maps a single item/detail.do response to an array of warehouse stock entries.
 * Pure function — no DB, no API.
 *
 * Accurate returns warehouse stock under detailWarehouseData.
 * Each entry has: { id: <accurateWarehouseId>, warehouseName, balance }
 */

const mapItemDetailToWarehouseStocks = (detail) => {
  // Accurate mengembalikan stok per gudang di field "detailWarehouseData".
  // Setiap entry: { id: <accurateWarehouseId>, balance: <qty>, warehouseName, ... }
  const rows = detail.detailWarehouseData ?? [];

  return rows.map((row) => ({
    accurateWarehouseId: row.id,
    quantity:            row.balance ?? 0,
  }));
};

module.exports = { mapItemDetailToWarehouseStocks };
