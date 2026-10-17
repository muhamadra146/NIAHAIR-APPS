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

const logger = require("../../utils/logger");
const { isMemberDiscountEligible } = require("../membership/membership.discount");

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
// currentDownPaymentIds: ID faktur DP Accurate yang SUDAH terpasang di faktur (hanya saat UPDATE).
//   null = tidak diketahui → DP tidak dikirim ulang (hindari double-apply).
const mapInvoiceToAccurate = (invoice, warehouse, accurateId = null, currentAccurateItemIds = [], accurateBranchId = null, currentDownPaymentIds = null) => {
  // On UPDATE: delete ALL current Accurate line items (fetched live from Accurate in service),
  // then add all current items fresh. "Replace all" strategy — reliable regardless of DB state.
  const deleteEntries = currentAccurateItemIds.map((id) => ({ id, _status: "DELETE" }));

  // Proportional FIXED_AMOUNT membership discount distribution across item yang dapat diskon member
  // (kategori dicentang di paket, tidak dikecualikan, bukan bahan baku). Bila konfigurasi paket sudah
  // berubah sehingga tidak ada item yang cocok, dibagi ke semua item non-bahan agar total tetap sama.
  // DB values (invoice_items.discount) are unchanged — commission base is protected.
  // This distributes the invoice-level membershipDiscountTotal into per-line itemCashDiscount
  // in the Accurate sync payload only. Rounding: last SERVICE item absorbs the remainder
  // so the distributed sum always equals membershipDiscountTotal exactly.
  //
  // PPN exclusive (TE4/P4): ERP memotong diskon nominal membership dari total TERMASUK PPN,
  // sedangkan Accurate memotong diskon sebelum PPN — porsi membership pada baris taxable
  // exclusive dikirim ÷ 1,11 (lihat addEntries) agar total Accurate tetap = grandTotal ERP.
  const membershipDiscountTotal = Number(invoice.membershipDiscountTotal ?? 0);
  const membershipDistributionMap = {};
  // Diskon membership nominal = dipotong di level invoice: grandTotal = subtotal + PPN − diskon member.
  // (Membership persen sudah ada di diskon baris: grandTotal = subtotal + PPN.) Dikenali dari angka
  // invoice sendiri — tipe paket saat ini bisa sudah diubah admin setelah invoice dibuat.
  const hasStoredTotals = invoice.grandTotal != null && invoice.subtotal != null;
  const isFixedMemberDiscount = membershipDiscountTotal > 0 && (hasStoredTotals
    ? Math.abs(Number(invoice.subtotal) + Number(invoice.totalTax ?? 0) - membershipDiscountTotal - Number(invoice.grandTotal)) < 0.01
    : invoice.membership?.discountType === "FIXED_AMOUNT");
  if (isFixedMemberDiscount) {
    const billable = invoice.items.filter((line) => !line.isMaterial);
    const eligible = billable.filter((line) => isMemberDiscountEligible(line.item, invoice.membership, false));
    const serviceItems = eligible.length > 0 ? eligible : billable;
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
            logger.warn(`[invoice sync mapper] skipping material item ${usageItem.materialItem?.itemCode} — not synced to Accurate`);
            continue;
          }
          if (!usageItem.unit?.accurateUnitId) {
            logger.warn(`[invoice sync mapper] skipping material item ${usageItem.materialItem?.itemCode} — unit not synced to Accurate`);
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
            logger.warn(`[invoice sync mapper] skipping material item ${usageItem.materialItem.itemCode} — no warehouse`);
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

  // ── Total Accurate == grandTotal ERP (P4) ─────────────────────────────
  // Accurate menghitung sendiri: (unitPrice × qty − itemCashDiscount), lalu PPN dari
  // taxable/inclusiveTax header + tax1Name per baris. Karena itu yang dikirim adalah
  // HARGA ASLI (bukan line.subtotal yang sudah dipotong diskon / sudah dikeluarkan PPN-nya),
  // dan diskon dikirim SEKALI sebagai nominal (itemCashDiscount = line.discount, nilai yang
  // sama persis dengan ERP — bukan itemDiscPercent yang dihitung ulang Accurate tanpa pembulatan).
  //   • inclusive : Accurate total = Σ(harga×qty − diskon) = grandTotal ERP
  //   • exclusive : Accurate total = Σ(harga×qty − diskon) × 1,11 = grandTotal ERP
  //   • DP        : detailDownPayment tidak mengubah total faktur (hanya sisa piutang)
  // Bahan baku (isMaterial) ikut kena PPN di Accurate bila layanan induknya kena PPN, karena
  // harganya dipindahkan dari layanan tsb — tanpa itu dasar PPN Accurate turun dan total berbeda.
  const isTaxableService = (l) => !l.isMaterial && l.taxable === true;
  const groupTaxable = {};
  layananItems.forEach((l) => { if (l.lineGroup && isTaxableService(l)) groupTaxable[l.lineGroup] = true; });
  const allServicesTaxable = layananItems.length > 0 && layananItems.every(isTaxableService);
  const materialTaxable = (m) => (hasSomeGrouped
    ? (m.lineGroup ? groupTaxable[m.lineGroup] === true : false)
    : allServicesTaxable);

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  const addEntries = invoice.items.map((line) => {
    const isMaterial = line.isMaterial === true;
    const qty        = Number(line.qty);
    const origPrice  = Number(line.price);

    // Bahan baku: harga cost asli. Layanan: harga asli dikurangi alokasi biaya bahan baku.
    let unitPrice  = origPrice;
    let extraCash  = 0; // sisa pembulatan alokasi bahan baku → masuk diskon nominal
    if (!isMaterial) {
      const materialShare = materialAllocationMap[line.id] ?? 0;
      if (materialShare !== 0 && qty > 0) {
        const lineAmount = origPrice * qty - materialShare;
        const exact      = lineAmount / qty;
        // Bulatkan ke atas 2 desimal, selisihnya dikirim sebagai diskon nominal agar total tetap tepat
        unitPrice = Math.ceil(round2(exact * 100)) / 100;
        if (round2(unitPrice * qty) < round2(lineAmount)) unitPrice = round2(unitPrice + 0.01);
        extraCash = round2(unitPrice * qty - lineAmount);
      }
    }

    const entry = {
      itemNo:       line.item.itemCode,
      itemUnitName: line.unit.name,
      quantity:     qty,
      unitPrice,
    };

    if (!isMaterial) {
      const discountAbs     = Number(line.discount ?? 0);
      let   membershipShare = membershipDistributionMap[line.id] ?? 0;
      // Diskon membership nominal di ERP dipotong SETELAH PPN (dari total termasuk pajak).
      // Accurate memotong diskon sebelum PPN → untuk PPN exclusive kirim nilai sebelum pajak.
      // Dibulatkan ke rupiah penuh: Accurate membulatkan PPN ke rupiah, sehingga DPP bulat
      // menghasilkan total yang sama dengan ERP (selisih pembulatan < Rp 1 diserap saat pelunasan).
      if (membershipShare > 0 && line.taxable === true && invoice.taxable && !invoice.inclusiveTax) {
        membershipShare = Math.round(membershipShare / 1.11);
      }
      const cash = round2(discountAbs + membershipShare + extraCash);
      if (cash > 0) entry.itemCashDiscount = cash;
    }

    // INVENTORY items require a warehouse; SERVICE items do not affect stock
    if (line.item.itemType === "INVENTORY" && warehouse?.accurateWarehouseId) {
      entry.warehouseId = warehouse.accurateWarehouseId;
    }

    // Tax line — layanan taxable, dan bahan baku yang harganya diambil dari layanan taxable
    if (isMaterial ? materialTaxable(line) : line.taxable === true) {
      entry.tax1Name = "PPN";
      // Penanda baris kena PPN. Accurate hanya memungut PPN bila master item Accurate punya pajak
      // (mis. OMBRE / BALAYAGE tidak) — dicek sebelum kirim di invoice.sync.service (P4)
      entry.useTax1  = true;
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

  // Down payment (deposit) yang diterapkan ke invoice.
  // CREATE: kirim semua. UPDATE: kirim hanya deposit yang BELUM terpasang di Accurate
  // (deposit yang diterapkan setelah sync pertama — G1-07). DP yang sudah terpasang tidak
  // dikirim ulang agar tidak double-apply dan melebihi nilai deposit.
  if (!accurateId || Array.isArray(currentDownPaymentIds)) {
    const already = new Set((currentDownPaymentIds ?? []).map(Number));
    const detailDownPayment = (invoice.invoiceDeposits ?? [])
      .map((row) => ({
        invoiceId:     Number(row.deposit.accurateDepositId),
        paymentAmount: Number(row.amountApplied),
      }))
      .filter((dp) => !accurateId || !already.has(dp.invoiceId));

    if (detailDownPayment.length > 0) {
      payload.detailDownPayment = detailDownPayment;
    }
  }

  return payload;
};

module.exports = { mapInvoiceToAccurate };
