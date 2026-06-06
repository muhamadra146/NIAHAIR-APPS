/**
 * Maps a single item/detail.do response to an array of warehouse stock entries.
 * Pure function — no DB, no API.
 *
 * Accurate returns warehouse stock under detailWarehouseData.
 * Each entry has: { id: <accurateWarehouseId>, warehouseName, balance }
 */

const mapItemDetailToWarehouseStocks = (detail) => {
  const rows =
    detail.detailWarehouseData ??   // confirmed field name
    detail.detailWarehouseItem ??   // fallback
    detail.warehouseDetail     ??
    detail.detailWarehouse     ??
    [];

  return rows.map((row) => ({
    accurateWarehouseId: row.id,
    quantity:            row.balance ?? 0,
  }));
};

module.exports = { mapItemDetailToWarehouseStocks };
