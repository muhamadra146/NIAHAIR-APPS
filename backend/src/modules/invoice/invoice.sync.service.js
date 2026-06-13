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

  // On UPDATE: fetch current Accurate item IDs via a minimal save (read-like)
  // so we can delete ALL existing items before adding fresh ones.
  // This is the only reliable way — DB accurateInvoiceDetailId becomes stale
  // when invoice items are deleted and recreated during an edit.
  let currentAccurateItemIds = [];
  if (isUpdate) {
    const currentResp = await accurateRequest(ACCURATE_INVOICE_SAVE, {
      method: "POST",
      body:   { id: invoice.accurateInvoiceId },
    });
    currentAccurateItemIds = (currentResp.r?.detailItem ?? []).map((i) => i.id);
    console.log(`[invoice sync] current Accurate items: ${currentAccurateItemIds.join(",")}`);
  }

  const payload = mapInvoiceToAccurate(invoice, warehouse, isUpdate ? invoice.accurateInvoiceId : null, currentAccurateItemIds);

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

  console.log(
    `[invoice sync] ${isUpdate ? "update" : "create"} invoiceId=${invoiceId}` +
    ` accurateId=${accurateId} number=${accurateNumber}`
  );

  return { synced: true, accurateId, accurateNumber, isUpdate };
};

module.exports = { syncInvoiceToAccurate };
