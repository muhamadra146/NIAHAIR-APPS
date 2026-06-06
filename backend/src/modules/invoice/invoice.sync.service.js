const { accurateRequest }        = require("../accurate/accurate.client");
const { findWarehouseByBranchId } = require("../inventory/inventory.repository");
const {
  findInvoiceForSync,
  markInvoiceSynced,
  markInvoiceItemSynced,
} = require("./invoice.sync.repository");
const { mapInvoiceToAccurate } = require("./invoice.sync.mapper");

const ACCURATE_INVOICE_SAVE = "/sales-invoice/save.do";

const syncInvoiceToAccurate = async (invoiceId) => {
  console.log(`[invoice sync] start invoiceId=${invoiceId}`);

  const invoice = await findInvoiceForSync(invoiceId);
  if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

  // Idempotency — skip if already pushed to Accurate
  if (invoice.accurateInvoiceId) {
    return { skipped: true, reason: "Already synced" };
  }

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

  // Validate warehouse for INVENTORY items
  const hasInventoryItem = invoice.items.some((l) => l.item.itemType === "INVENTORY");
  let warehouse = null;
  if (hasInventoryItem) {
    warehouse = await findWarehouseByBranchId(invoice.branchId);
    if (!warehouse?.accurateWarehouseId) {
      throw new Error("Branch warehouse not mapped to Accurate yet");
    }
  }

  // Validate applied deposits are synced
  for (const id of invoice.invoiceDeposits) {
    if (!id.deposit.accurateDepositId || !id.deposit.accurateDepositNumber) {
      throw new Error(`Deposit not synced to Accurate yet: ${id.deposit.id}`);
    }
  }

  const payload = mapInvoiceToAccurate(invoice, warehouse);

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

  // Save per-line Accurate detail IDs if the API returns them
  const detailItems = response.r.detailItem ?? [];
  for (let i = 0; i < detailItems.length; i++) {
    const line = invoice.items[i];
    if (line && detailItems[i]?.id) {
      await markInvoiceItemSynced(line.id, detailItems[i].id);
    }
  }

  console.log(
    `[invoice sync] success invoiceId=${invoiceId}` +
    ` accurateId=${accurateId} number=${accurateNumber}`
  );

  return { synced: true, accurateId, accurateNumber };
};

module.exports = { syncInvoiceToAccurate };
