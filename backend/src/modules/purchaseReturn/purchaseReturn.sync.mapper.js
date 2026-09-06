'use strict';

const formatDate = (d) => {
  const dt   = new Date(d);
  const yyyy = dt.getUTCFullYear();
  const mm   = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd   = String(dt.getUTCDate()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Maps a fully-included PurchaseReturn to an Accurate purchase-return payload.
 * Accurate endpoint: POST /purchase-return/save.do
 */
const mapPurchaseReturnToAccurate = (ret, accurateBranchId = null) => {
  const syncableItems = ret.items.filter((i) => i.item.accurateItemId);

  const detailItem = syncableItems.map((i) => {
    const entry = {
      itemId:    i.item.accurateItemId,
      quantity:  Number(i.qty),
      unitPrice: Number(i.price),
    };
    if (i.unit.accurateUnitId) {
      entry.itemUnitId = i.unit.accurateUnitId;
    } else {
      entry.unitName = i.unit.name;
    }
    return entry;
  });

  const payload = {
    vendorId:          ret.purchaseInvoice.supplier.accurateVendorId,
    purchaseInvoiceId: ret.purchaseInvoice.accuratePurchaseInvoiceId,
    transDate:         formatDate(ret.returnDate),
    number:            ret.returnNo,
    description:       ret.notes ?? "",
    ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
    detailItem,
  };

  return payload;
};

module.exports = { mapPurchaseReturnToAccurate };
