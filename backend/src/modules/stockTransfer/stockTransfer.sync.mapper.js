const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const mapTransferToAccurate = (transfer) => ({
  transDate:        formatDate(transfer.transferDate),
  description:      transfer.notes ?? `Transfer ${transfer.transferNo}`,
  fromWarehouseId:  transfer.sourceWarehouse.accurateWarehouseId,
  toWarehouseId:    transfer.destinationWarehouse.accurateWarehouseId,
  detailItemTransfer: transfer.items
    .filter((it) => it.item.itemType === "INVENTORY")
    .map((it) => ({
      itemId:   it.item.accurateItemId,
      quantity: Number(it.qty),
      unitId:   it.item.defaultUnit.accurateUnitId,
    })),
});

module.exports = { mapTransferToAccurate };
