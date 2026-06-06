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
const mapInvoiceToAccurate = (invoice, warehouse) => {
  const detailItem = invoice.items.map((line) => {
    const entry = {
      itemNo:         line.item.itemCode,
      itemUnitName:   line.unit.name,
      quantity:       Number(line.qty),
      unitPrice:      Number(line.price),
      discountAmount: Number(line.discount ?? 0),
    };

    // INVENTORY items require a warehouse; SERVICE items do not affect stock
    if (line.item.itemType === "INVENTORY" && warehouse?.accurateWarehouseId) {
      entry.warehouseId = warehouse.accurateWarehouseId;
    }

    return entry;
  });

  const payload = {
    customerNo:  invoice.customer.customerNo,
    transDate:   formatDate(invoice.invoiceDate),
    description: invoice.notes ?? `Invoice ${invoice.invoiceNo}`,
    detailItem,
  };

  // Apply synced down payments — Accurate field: detailDownPayment
  // invoiceId = Accurate's internal ID of the down payment (SID) invoice
  const detailDownPayment = (invoice.invoiceDeposits ?? []).map((row) => ({
    invoiceId:     Number(row.deposit.accurateDepositId),
    paymentAmount: Number(row.amountApplied),
  }));

  if (detailDownPayment.length > 0) {
    payload.detailDownPayment = detailDownPayment;
  }

  return payload;
};

module.exports = { mapInvoiceToAccurate };
