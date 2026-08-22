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
// accurateBranchId: Int — Accurate branch ID; required for multi-branch Accurate setup
const mapInvoiceToAccurate = (invoice, warehouse, accurateId = null, currentAccurateItemIds = [], accurateBranchId = null) => {
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

  // ── Hitung alokasi biaya bahan baku ke layanan ───────────────────────
  // Bahan baku (isMaterial=true) tidak masuk tagihan client, tapi harganya
  // dialokasikan dari harga layanan sebelum di-sync ke Accurate.
  // Sehingga di Accurate: layanan_price = original - alokasi_bahan_baku,
  // dan total Accurate = grand total invoice (apa yang dibayar client).
  //
  // STRATEGI:
  //   A) Group-based (lineGroup != null) — bahan baku dialokasikan ke layanan
  //      yang memiliki lineGroup yang sama (explicit 1-to-1 mapping).
  //      Berlaku untuk invoice yang dibuat setelah fitur grouping.
  //   B) Proportional fallback (semua lineGroup = null) — biaya bahan baku
  //      didistribusikan proporsional ke semua layanan (invoice lama).
  const layananItems  = invoice.items.filter((l) => !l.isMaterial);
  const materialItems = invoice.items.filter((l) => l.isMaterial);

  // Map: invoiceItem.id → nominal biaya bahan baku yang dialokasikan ke layanan ini
  const materialAllocationMap = {};

  const hasSomeGrouped = materialItems.some((m) => m.lineGroup);

  if (hasSomeGrouped) {
    // ── A) Group-based allocation ──────────────────────────────────────
    // Build: lineGroup → total biaya bahan baku dalam grup tersebut
    const groupCostMap = {};
    materialItems.forEach((m) => {
      if (!m.lineGroup) return; // orphan — abaikan dari alokasi
      const cost = Number(m.price) * Number(m.qty);
      groupCostMap[m.lineGroup] = (groupCostMap[m.lineGroup] ?? 0) + cost;
    });

    // Setiap layanan menerima alokasi = total HPP bahan baku dalam grupnya
    layananItems.forEach((line) => {
      materialAllocationMap[line.id] = groupCostMap[line.lineGroup ?? ""] ?? 0;
    });
  } else {
    // ── B) Proportional fallback (invoice lama tanpa lineGroup) ────────
    const totalMaterialCost = materialItems.reduce(
      (sum, l) => sum + Number(l.price) * Number(l.qty),
      0
    );
    const totalLayananSubtotal = layananItems.reduce(
      (sum, l) => sum + Number(l.subtotal),
      0
    );
    if (totalMaterialCost > 0 && totalLayananSubtotal > 0) {
      let distributed = 0;
      layananItems.forEach((line, idx) => {
        const isLast = idx === layananItems.length - 1;
        const share  = isLast
          ? totalMaterialCost - distributed
          : Math.round((Number(line.subtotal) / totalLayananSubtotal) * totalMaterialCost);
        materialAllocationMap[line.id] = share;
        distributed += share;
      });
    }
  }

  const addEntries = invoice.items.map((line) => {
    const isMaterial = line.isMaterial === true;
    const qty        = Number(line.qty);
    const origPrice  = Number(line.price);

    // Untuk bahan baku: kirim harga cost asli (tidak ada penyesuaian)
    // Untuk layanan: kurangi harga dengan alokasi biaya bahan baku
    let unitPrice;
    if (isMaterial) {
      unitPrice = origPrice;
    } else {
      const materialShare    = materialAllocationMap[line.id] ?? 0;
      const adjustedSubtotal = Number(line.subtotal) - materialShare;
      // unitPrice setelah alokasi — jaga 3 desimal agar tidak ada selisih pembulatan
      unitPrice = qty > 0
        ? parseFloat((adjustedSubtotal / qty).toFixed(3))
        : origPrice;
    }

    const entry = {
      itemNo:       line.item.itemCode,
      itemUnitName: line.unit.name,
      quantity:     qty,
      unitPrice,
    };

    // Bahan baku tidak punya diskon terpisah di Accurate — harganya sudah cost price
    if (!isMaterial) {
      // Route discount ke Accurate field yang benar:
      //   AMOUNT → itemCashDiscount | PERCENT → itemDiscPercent
      // Catatan: jika ada material allocation, diskon sudah ter-reflect di adjustedSubtotal
      // (subtotal sudah setelah diskon), sehingga tidak perlu kirim discount lagi.
      // Tapi kita tetap kirim discountPercent agar Accurate bisa display-nya
      const discountAbs     = Number(line.discount ?? 0);
      const membershipShare = membershipDistributionMap[line.id] ?? 0;
      if (discountAbs > 0 || membershipShare > 0) {
        if (line.discountType === "PERCENT") {
          const lineTotal = origPrice * qty;
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
    }

    // INVENTORY items require a warehouse; SERVICE items do not affect stock
    if (line.item.itemType === "INVENTORY" && warehouse?.accurateWarehouseId) {
      entry.warehouseId = warehouse.accurateWarehouseId;
    }

    // Tax line — hanya untuk layanan yang taxable (bahan baku tidak kena PPN)
    if (!isMaterial && line.taxable === true) {
      entry.tax1Name = "PPN";
    }

    return entry;
  });

  const detailItem = [...deleteEntries, ...addEntries, ...materialEntries];

  const payload = {
    ...(accurateId ? { id: accurateId } : {}),
    customerNo:   invoice.customer.customerNo,
    transDate:    formatDate(invoice.invoiceDate),
    description:  invoice.notes
      ? `Invoice ${invoice.invoiceNo}\n${invoice.notes}`
      : `Invoice ${invoice.invoiceNo}`,
    taxable:      invoice.taxable,
    inclusiveTax: invoice.inclusiveTax,
    ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
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
