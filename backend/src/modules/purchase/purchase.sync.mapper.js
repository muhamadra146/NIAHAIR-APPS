'use strict';

const formatDate = (d) => {
  const dt   = new Date(d);
  const yyyy = dt.getUTCFullYear();
  const mm   = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd   = String(dt.getUTCDate()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}`;
};

// Accurate paymentTermId values (from /payment-term/list.do)
const ACCURATE_PAYMENT_TERM_ID = {
  "c.o.d": 100,
  "cod":   100,
  "cicilan": 50,
  "net 7":  102,
  "net 15": 103,
  "net 30": 104,
  "net 45": 105,
  "net 60": 106,
};

const resolvePaymentTermId = (paymentTerms) => {
  if (!paymentTerms) return undefined;
  return ACCURATE_PAYMENT_TERM_ID[paymentTerms.toLowerCase().trim()] ?? undefined;
};

/**
 * Maps a fully-included PurchaseInvoice to an Accurate purchase-invoice payload.
 */
const mapPurchaseInvoiceToAccurate = (invoice, billNumber, accurateBranchId = null) => {
  const syncableItems = invoice.items.filter((item) => item.item.accurateItemId);

  const detailItem = syncableItems.map((item) => {
    const entry = {
      itemId:    item.item.accurateItemId,
      quantity:  Number(item.qty),
      unitPrice: Number(item.price),
    };
    if (item.unit.accurateUnitId) {
      entry.itemUnitId = item.unit.accurateUnitId;
    } else {
      entry.unitName = item.unit.name;
    }
    if (Number(item.discount) > 0) {
      entry.itemDiscPercent = Number(item.discount);
    }
    return entry;
  });

  const payload = {
    vendorId:     invoice.supplier.accurateVendorId,
    transDate:    formatDate(invoice.invoiceDate),
    billNumber,
    description:  invoice.notes ?? "",
    taxable:      invoice.taxable,
    inclusiveTax: invoice.inclusiveTax,
    ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
    detailItem,
  };

  const paymentTermId = resolvePaymentTermId(invoice.paymentTerms);
  if (paymentTermId !== undefined) {
    payload.paymentTermId = paymentTermId;
  }

  if (invoice.taxable) {
    if (invoice.taxInvoiceDate) {
      payload.taxDate = formatDate(invoice.taxInvoiceDate);
    }
    if (invoice.taxInvoiceNo) {
      payload.taxNumber = invoice.taxInvoiceNo;
    }
  }

  return payload;
};

module.exports = { mapPurchaseInvoiceToAccurate };
