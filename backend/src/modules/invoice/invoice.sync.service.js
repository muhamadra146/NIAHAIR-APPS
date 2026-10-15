const logger = require('../../utils/logger');
const { accurateRequest }         = require("../accurate/accurate.client");
const { findWarehouseByBranchId } = require("../inventory/inventory.repository");
const { getAccurateBranchId }     = require("../branch/branch.repository");
const {
  findInvoiceForSync,
  markInvoiceSynced,
  markInvoiceItemSynced,
} = require("./invoice.sync.repository");
const { mapInvoiceToAccurate } = require("./invoice.sync.mapper");

const ACCURATE_INVOICE_SAVE   = "/sales-invoice/save.do";
const ACCURATE_INVOICE_DETAIL = "/sales-invoice/detail.do";

const syncInvoiceToAccurate = async (invoiceId) => {
  logger.info(`[invoice sync] start invoiceId=${invoiceId}`);

  const invoice = await findInvoiceForSync(invoiceId);
  if (!invoice) throw new Error(`Invoice tidak ditemukan: ${invoiceId}`);

  // Invoice batal tidak boleh dikirim (lagi) ke Accurate — job tertunda/retry dilewati (G1-06)
  if (invoice.status === "CANCELLED") {
    logger.info(`[invoice sync] skip cancelled invoiceId=${invoiceId}`);
    return { synced: false, skipped: true, reason: "CANCELLED" };
  }

  const isUpdate = !!invoice.accurateInvoiceId;

  // Validate customer sync
  if (!invoice.customer?.accurateCustomerId || !invoice.customer?.customerNo) {
    throw new Error("Customer not synced to Accurate yet");
  }

  // Validate all line items
  for (const line of invoice.items) {
    if (!line.item.accurateItemId) {
      throw new Error(`Item not synced to Accurate yet: ${line.item.itemCode}`);
    }
    if (!line.unit.accurateUnitId) {
      throw new Error(`Unit not synced to Accurate yet: ${line.unit.name}`);
    }
  }

  // Validate warehouse for INVENTORY items (invoice lines + material usage items)
  const hasInventoryItem = invoice.items.some((l) => l.item.itemType === "INVENTORY");
  const hasMaterialUsage = (invoice.treatmentSessions ?? []).some((s) =>
    s.treatmentItems.some((ti) => ti.materialUsages.some((mu) => mu.usageItems.length > 0))
  );
  let warehouse = null;
  if (hasInventoryItem || hasMaterialUsage) {
    warehouse = await findWarehouseByBranchId(invoice.branchId);
    if (hasInventoryItem && !warehouse?.accurateWarehouseId) {
      throw new Error("Branch warehouse not mapped to Accurate yet");
    }
    // Material usage items: warehouse absence causes per-item skip in mapper (non-fatal)
  }

  // Validate applied deposits are synced
  for (const id of invoice.invoiceDeposits) {
    if (!id.deposit.accurateDepositId || !id.deposit.accurateDepositNumber) {
      throw new Error(`Deposit not synced to Accurate yet: ${id.deposit.id}`);
    }
  }

  // On UPDATE: fetch current Accurate item IDs via a minimal save (read-like)
  // so we can delete ALL existing items before adding fresh ones.
  // This is the only reliable way — DB accurateInvoiceDetailId becomes stale
  // when invoice items are deleted and recreated during an edit.
  let currentAccurateItemIds = [];
  // ID faktur DP yang sudah terpasang di Accurate — null bila respons tidak memuatnya
  let currentDownPaymentIds = null;
  if (isUpdate) {
    const currentResp = await accurateRequest(ACCURATE_INVOICE_SAVE, {
      method: "POST",
      body:   { id: invoice.accurateInvoiceId },
    });
    currentAccurateItemIds = (currentResp.r?.detailItem ?? []).map((i) => i.id);
    logger.info(`[invoice sync] current Accurate items: ${currentAccurateItemIds.join(",")}`);

    // Deposit yang diterapkan SETELAH sync pertama harus ikut dikirim (G1-07),
    // kalau tidak pembayaran berikutnya ditolak Accurate "melebihi nilai piutang"
    let currentDp = currentResp.r?.detailDownPayment;
    if (!Array.isArray(currentDp)) {
      // Fallback baca-saja: detail.do selalu memuat detailDownPayment
      const detailResp = await accurateRequest(`${ACCURATE_INVOICE_DETAIL}?id=${invoice.accurateInvoiceId}`, { method: "GET" });
      currentDp = detailResp.d?.detailDownPayment;
    }
    if (Array.isArray(currentDp)) {
      currentDownPaymentIds = currentDp
        .map((d) => d.invoiceId ?? d.invoice?.id)
        .filter((v) => v != null);
    }
  }

  // Look up Accurate branch ID for this invoice's branch
  const accurateBranchId = await getAccurateBranchId(invoice.branchId);

  const payload = mapInvoiceToAccurate(invoice, warehouse, isUpdate ? invoice.accurateInvoiceId : null, currentAccurateItemIds, accurateBranchId, currentDownPaymentIds);

  const response = await accurateRequest(ACCURATE_INVOICE_SAVE, {
    method: "POST",
    body:   payload,
  });

  // response.r = created entity, response.d = message / error detail
  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateId     = response.r.id;
  const accurateNumber = response.r.number ?? response.r.no ?? null;

  await markInvoiceSynced({
    id:                    invoiceId,
    accurateInvoiceId:     accurateId,
    accurateInvoiceNumber: accurateNumber,
  });

  // Save per-line Accurate detail IDs — only for newly added items (no _status DELETE)
  const addedItems = (response.r.detailItem ?? []).filter((i) => i._status !== "DELETE");
  for (let i = 0; i < addedItems.length; i++) {
    const line = invoice.items[i];
    if (line && addedItems[i]?.id) {
      await markInvoiceItemSynced(line.id, addedItems[i].id);
    }
  }

  logger.info(
    `[invoice sync] ${isUpdate ? "update" : "create"} invoiceId=${invoiceId}` +
    ` accurateId=${accurateId} number=${accurateNumber}`
  );

  return { synced: true, accurateId, accurateNumber, isUpdate };
};

module.exports = { syncInvoiceToAccurate };
