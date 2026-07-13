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

  // Proportional FIXED_AMOUNT membership discount distribution across SERVICE items.
  // DB values (invoice_items.discount) are unchanged — commission base is protected.
  // This distributes the invoice-level membershipDiscountTotal into per-line itemCashDiscount
  // in the Accurate sync payload only. Rounding: last SERVICE item absorbs the remainder
  // so the distributed sum always equals membershipDiscountTotal exactly.
  //
  // Known discrepancy (TE4): for taxable FIXED_AMOUNT SERVICE items, Accurate computes tax
  // on the post-itemCashDiscount base, while local tax was computed on the pre-membership
  // grossLine. This is an accepted trade-off — the difference is small (tax on the discount
  // amount) and fixing it would require storing Accurate-specific tax overrides locally.
  const membershipDiscountTotal = Number(invoice.membershipDiscountTotal ?? 0);
  const membershipDistributionMap = {};
  if (membershipDiscountTotal > 0 && invoice.membership?.discountType === "FIXED_AMOUNT") {
    const serviceItems = invoice.items.filter((line) => line.item.itemType === "SERVICE");
    const serviceTotal = serviceItems.reduce(
      (sum, line) => sum + Number(line.price) * Number(line.qty),
      0
    );
    if (serviceTotal > 0) {
      let distributed = 0;
      serviceItems.forEach((line, idx) => {
        const isLast  = idx === serviceItems.length - 1;
        const lineAmt = Number(line.price) * Number(line.qty);
        const share   = isLast
          ? membershipDiscountTotal - distributed
          : Math.round((lineAmt / serviceTotal) * membershipDiscountTotal);
        membershipDistributionMap[line.id] = share;
        distributed += share;
      });
    }
  }

  // Flatten material usage items across all treatment sessions — synced as Rp 0 lines
  // so Accurate can reduce inventory without affecting the client-facing price.
  // Items missing accurateItemId / accurateUnitId are skipped with a console.warn.
  const materialEntries = [];
  for (const session of invoice.treatmentSessions ?? []) {
    for (const ti of session.treatmentItems) {
      for (const mu of ti.materialUsages) {
        for (const usageItem of mu.usageItems) {
          if (!usageItem.materialItem?.accurateItemId) {
            console.warn(`[invoice sync mapper] skipping material item ${usageItem.materialItem?.itemCode} — not synced to Accurate`);
            continue;
          }
          if (!usageItem.unit?.accurateUnitId) {
            console.warn(`[invoice sync mapper] skipping material item ${usageItem.materialItem?.itemCode} — unit not synced to Accurate`);
            continue;
          }
          const entry = {
            itemNo:       usageItem.materialItem.itemCode,
            itemUnitName: usageItem.unit.name,
            quantity:     Number(usageItem.qty),
            unitPrice:    0,
          };
          if (warehouse?.accurateWarehouseId) {
            entry.warehouseId = warehouse.accurateWarehouseId;
          } else {
            console.warn(`[invoice sync mapper] skipping material item ${usageItem.materialItem.itemCode} — no warehouse`);
            continue;
          }
          materialEntries.push(entry);
        }
      }
    }
  }

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
    const discountAbs      = Number(line.discount ?? 0);
    const membershipShare  = membershipDistributionMap[line.id] ?? 0;
    if (discountAbs > 0 || membershipShare > 0) {
      if (line.discountType === "PERCENT") {
        const lineTotal = Number(line.price) * Number(line.qty);
        if (lineTotal > 0) {
          entry.itemDiscPercent = parseFloat(((discountAbs / lineTotal) * 100).toFixed(4));
        }
        if (membershipShare > 0) {
          entry.itemCashDiscount = membershipShare;
        }
      } else {
        entry.itemCashDiscount = discountAbs + membershipShare;
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

  const detailItem = [...deleteEntries, ...addEntries, ...materialEntries];

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
