const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// Accurate uses itemAdjustmentType (NOT adjustmentType) with values confirmed from API response:
// "ADJUSTMENT_IN" = Penambahan, "ADJUSTMENT_OUT" = Pengurangan
const resolveAdjustmentType = (qtyChange) =>
  Number(qtyChange) >= 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

const mapAdjustmentToAccurate = ({ movement, inventory, glAccount, unitCostPrice = 0 }) => ({
  transDate:   formatDate(movement.createdAt),
  description: movement.notes ?? movement.reason ?? "Penyesuaian Stok",
  glAccountId: glAccount.accurateGlAccountId,
  detailItem: [
    {
      itemId:             inventory.item.accurateItemId,
      quantity:           Math.abs(Number(movement.qtyChange)),
      unitId:             inventory.item.defaultUnit.accurateUnitId,
      unitPrice:          unitCostPrice,
      warehouseId:        inventory.warehouse.accurateWarehouseId,
      itemAdjustmentType: resolveAdjustmentType(movement.qtyChange),
    },
  ],
});

module.exports = { mapAdjustmentToAccurate };
