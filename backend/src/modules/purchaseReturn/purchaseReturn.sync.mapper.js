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
 *
 * taxable + inclusiveTax diwarisi dari invoice induk (tidak disimpan di return secara terpisah).
 * itemDiscPercent diambil dari field discount di PurchaseReturnItem.
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
    // Kirim diskon per item jika ada
    if (i.discount != null && Number(i.discount) > 0) {
      entry.itemDiscPercent = Number(i.discount);
    }
    return entry;
  });

  // Warisi pengaturan pajak dari invoice induk
  const invoice = ret.purchaseInvoice;

  const payload = {
    vendorId:          invoice.supplier.accurateVendorId,
    purchaseInvoiceId: invoice.accuratePurchaseInvoiceId,
    transDate:         formatDate(ret.returnDate),
    number:            ret.returnNo,
    description:       ret.notes ?? "",
    taxable:           invoice.taxable      ?? false,
    inclusiveTax:      invoice.inclusiveTax ?? false,
    ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
    detailItem,
  };

  return payload;
};

module.exports = { mapPurchaseReturnToAccurate };
