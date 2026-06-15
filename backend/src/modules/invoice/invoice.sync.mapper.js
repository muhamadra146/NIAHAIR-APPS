/**
 * Maps a local Invoice (with customer, items, invoiceDeposits) to an Accurate
 * sales invoice payload. Pure function — no DB, no API.
 *
 * Field assumptions (verify against your Accurate Online instance):
 *   item.itemCode   → itemNo   (Accurate item's "no" field)
 *   unit.name       → itemUnitName (Accurate item unit name)
 *   warehouseId     → warehouse's accurateWarehouseId (Int)
 *   detailDownPayment → array of { invoiceId, paymentAmount } to apply deposits
 */

const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// warehouse: { accurateWarehouseId: Int } — pass null for service-only invoices
// accurateId: Int — pass to UPDATE an existing Accurate invoice, null to CREATE
// currentAccurateItemIds: Int[] — Accurate line item IDs to delete before re-adding
const mapInvoiceToAccurate = (invoice, warehouse, accurateId = null, currentAccurateItemIds = []) => {
  // On UPDATE: delete ALL current Accurate line items (fetched live from Accurate in service),
  // then add all current items fresh. "Replace all" strategy — reliable regardless of DB state.
  const deleteEntries = currentAccurateItemIds.map((id) => ({ id, _status: "DELETE" }));

  const addEntries = invoice.items.map((line) => {
    const entry = {
      itemNo:       line.item.itemCode,
      itemUnitName: line.unit.name,
      quantity:     Number(line.qty),
      unitPrice:    Number(line.price),
    };

    // Route discount to the correct Accurate field based on discountType:
    //   AMOUNT → itemCashDiscount (Rp nominal, no rounding loss)
    //   PERCENT → itemDiscPercent (percentage, Accurate computes the nominal)
    const discountAbs = Number(line.discount ?? 0);
    if (discountAbs > 0) {
      if (line.discountType === "PERCENT") {
        const lineTotal = Number(line.price) * Number(line.qty);
        if (lineTotal > 0) {
          entry.itemDiscPercent = parseFloat(((discountAbs / lineTotal) * 100).toFixed(4));
        }
      } else {
        entry.itemCashDiscount = discountAbs;
      }
    }

    // INVENTORY items require a warehouse; SERVICE items do not affect stock
    if (line.item.itemType === "INVENTORY" && warehouse?.accurateWarehouseId) {
      entry.warehouseId = warehouse.accurateWarehouseId;
    }

    // Tax line — only when the item is individually marked taxable
    if (line.taxable === true) {
      entry.tax1Name = "PPN";
    }

    return entry;
  });

  const detailItem = [...deleteEntries, ...addEntries];

  const payload = {
    ...(accurateId ? { id: accurateId } : {}),
    customerNo:  invoice.customer.customerNo,
    transDate:   formatDate(invoice.invoiceDate),
    description: invoice.notes
      ? `Invoice ${invoice.invoiceNo}\n${invoice.notes}`
      : `Invoice ${invoice.invoiceNo}`,
    taxable:     invoice.taxable,
    inclusiveTax: invoice.inclusiveTax,
    detailItem,
  };

  // Apply synced down payments — only on CREATE (not UPDATE).
  // On update, Accurate already has the deposit link from initial creation;
  // re-sending it would double-apply and exceed the deposit amount.
  if (!accurateId) {
    const detailDownPayment = (invoice.invoiceDeposits ?? []).map((row) => ({
      invoiceId:     Number(row.deposit.accurateDepositId),
      paymentAmount: Number(row.amountApplied),
    }));

    if (detailDownPayment.length > 0) {
      payload.detailDownPayment = detailDownPayment;
    }
  }

  return payload;
};

module.exports = { mapInvoiceToAccurate };
