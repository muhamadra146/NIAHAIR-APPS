const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// Accurate item-transfer API field names (confirmed from API response):
// - warehouseId         = Gudang (source)
// - referenceWarehouseId = Gudang Tujuan (destination)
// - itemTransferType    = "TRANSFER_OUT" (Kirim) or "TRANSFER_IN" (Terima)
// - detailItem          = line items array
const mapTransferToAccurate = (transfer, accurateBranchId = null) => ({
  transDate:            formatDate(transfer.transferDate),
  description:          transfer.notes ?? `Transfer ${transfer.transferNo}`,
  itemTransferType:     "TRANSFER_OUT",
  warehouseId:          transfer.sourceWarehouse.accurateWarehouseId,
  referenceWarehouseId: transfer.destinationWarehouse.accurateWarehouseId,
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailItem: transfer.items
    .filter((it) => it.item.itemType === "INVENTORY")
    .map((it) => ({
      itemId:   it.item.accurateItemId,
      quantity: Number(it.qty),
      unitId:   it.item.defaultUnit.accurateUnitId,
    })),
});

module.exports = { mapTransferToAccurate };
