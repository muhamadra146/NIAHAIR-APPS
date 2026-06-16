const { accurateRequest }    = require("../accurate/accurate.client");
const { mapTransferToAccurate } = require("./stockTransfer.sync.mapper");
const {
  findTransferForSync,
  markTransferSynced,
  markTransferItemSynced,
} = require("./stockTransfer.sync.repository");

const ACCURATE_ITEM_TRANSFER_SAVE = "/item-transfer/save.do";

const syncTransferToAccurate = async (transferId) => {
  console.log(`[transfer sync] start transferId=${transferId}`);

  const transfer = await findTransferForSync(transferId);
  if (!transfer) throw new Error(`Stock transfer not found: ${transferId}`);

  // Idempotency — skip if already synced
  if (transfer.accurateTransferId) {
    return { skipped: true, reason: "Already synced" };
  }

  // Only sync when RECEIVED (transfer fully confirmed)
  if (transfer.status !== "RECEIVED") {
    throw new Error(`Transfer status must be RECEIVED to sync, got: ${transfer.status}`);
  }

  // Validate source warehouse Accurate mapping
  if (!transfer.sourceWarehouse.accurateWarehouseId) {
    throw new Error(`Source warehouse not mapped to Accurate: ${transfer.sourceWarehouse.name}`);
  }

  // Validate destination warehouse Accurate mapping
  if (!transfer.destinationWarehouse.accurateWarehouseId) {
    throw new Error(`Destination warehouse not mapped to Accurate: ${transfer.destinationWarehouse.name}`);
  }

  // Filter INVENTORY items only and validate each
  const inventoryItems = transfer.items.filter((it) => it.item.itemType === "INVENTORY");

  if (inventoryItems.length === 0) {
    throw new Error("Transfer has no INVENTORY items to sync");
  }

  for (const it of inventoryItems) {
    if (!it.item.accurateItemId) {
      throw new Error(`Item not synced to Accurate yet: ${it.item.itemCode}`);
    }
    if (!it.item.defaultUnit) {
      throw new Error(`Item has no default unit: ${it.item.itemCode}`);
    }
    if (!it.item.defaultUnit.accurateUnitId) {
      throw new Error(`Default unit not synced to Accurate yet for item: ${it.item.itemCode}`);
    }
  }

  const payload = mapTransferToAccurate(transfer);

  console.log("[transfer sync payload]", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_ITEM_TRANSFER_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateTransferId     = response.r.id;
  const accurateTransferNumber = response.r.number ?? response.r.no ?? null;

  await markTransferSynced({ id: transferId, accurateTransferId, accurateTransferNumber });

  // Save per-line Accurate detail IDs
  const details = response.r.detailItemTransfer ?? [];
  for (let i = 0; i < inventoryItems.length; i++) {
    if (details[i]?.id) {
      await markTransferItemSynced(inventoryItems[i].id, details[i].id);
    }
  }

  console.log(
    `[transfer sync] success transferId=${transferId}` +
    ` accurateId=${accurateTransferId} number=${accurateTransferNumber}`
  );

  return { synced: true, accurateTransferId, accurateTransferNumber };
};

module.exports = { syncTransferToAccurate };
