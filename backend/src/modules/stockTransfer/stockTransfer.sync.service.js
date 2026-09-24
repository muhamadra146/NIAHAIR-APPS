const logger = require('../../utils/logger');
const { accurateRequest }       = require("../accurate/accurate.client");
const { getAccurateBranchId }   = require("../branch/branch.repository");
const { mapTransferToAccurate } = require("./stockTransfer.sync.mapper");
const {
  findTransferForSync,
  markTransferSynced,
  markTransferReceiveSynced,
  markTransferItemSynced,
  findReceiveAccurateId,
} = require("./stockTransfer.sync.repository");

const ACCURATE_ITEM_TRANSFER_SAVE = "/item-transfer/save.do";

const syncTransferToAccurate = async (transferId) => {
  logger.info(`[transfer sync] start transferId=${transferId}`);

  const transfer = await findTransferForSync(transferId);
  if (!transfer) throw new Error(`Stock transfer not found: ${transferId}`);

  // Idempotency — skip if already synced
  if (transfer.accurateTransferId) {
    return { skipped: true, reason: "Already synced" };
  }

  // Sync is triggered at IN_TRANSIT (when goods leave source warehouse)
  if (transfer.status !== "IN_TRANSIT" && transfer.status !== "RECEIVED") {
    throw new Error(`Transfer status must be IN_TRANSIT or RECEIVED to sync, got: ${transfer.status}`);
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

  // Look up Accurate branch ID via source warehouse's branch
  const accurateBranchId = transfer.sourceWarehouse?.branchId
    ? await getAccurateBranchId(transfer.sourceWarehouse.branchId)
    : null;

  const payload = mapTransferToAccurate(transfer, accurateBranchId);

  logger.info("[transfer sync payload]", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_ITEM_TRANSFER_SAVE, {
    method: "POST",
    body:   payload,
  });

  logger.info("[transfer sync response]", JSON.stringify(response));

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateTransferId     = response.r.id;
  const accurateTransferNumber = response.r.number ?? response.r.no ?? null;

  await markTransferSynced({ id: transferId, accurateTransferId, accurateTransferNumber });

  // Save per-line Accurate detail IDs
  const details = response.r.detailItem ?? [];
  for (let i = 0; i < inventoryItems.length; i++) {
    if (details[i]?.id) {
      await markTransferItemSynced(inventoryItems[i].id, details[i].id);
    }
  }

  logger.info(
    `[transfer sync] success transferId=${transferId}` +
    ` accurateId=${accurateTransferId} number=${accurateTransferNumber}`
  );

  return { synced: true, accurateTransferId, accurateTransferNumber };
};

// ── TRANSFER_IN sync (Terima Barang) ──────────────────────────────────
const syncTransferReceiveToAccurate = async (transferId) => {
  logger.info(`[transfer receive sync] start transferId=${transferId}`);

  const transfer = await findTransferForSync(transferId);
  if (!transfer) throw new Error(`Stock transfer not found: ${transferId}`);

  // Must be RECEIVED status
  if (transfer.status !== "RECEIVED") {
    throw new Error(`Transfer status must be RECEIVED to sync receive, got: ${transfer.status}`);
  }

  // TRANSFER_OUT must be synced first
  if (!transfer.accurateTransferId) {
    throw new Error(`TRANSFER_OUT not yet synced to Accurate for transfer: ${transfer.transferNo}`);
  }

  // Idempotency — skip if TRANSFER_IN already synced
  const existingReceiveId = await findReceiveAccurateId(transferId);
  if (existingReceiveId) {
    return { skipped: true, reason: "TRANSFER_IN already synced" };
  }

  if (!transfer.destinationWarehouse.accurateWarehouseId) {
    throw new Error(`Destination warehouse not mapped to Accurate: ${transfer.destinationWarehouse.name}`);
  }

  const inventoryItems = transfer.items.filter((it) => it.item.itemType === "INVENTORY");
  if (inventoryItems.length === 0) {
    throw new Error("Transfer has no INVENTORY items to sync");
  }

  // Build TRANSFER_IN payload — references each TRANSFER_OUT detail line by fromItemTransferDetailId
  // receivedQty may differ from qty if user did a partial receive
  const payload = {
    itemTransferType:   "TRANSFER_IN",
    fromItemTransferId: transfer.accurateTransferId,
    warehouseId:        transfer.destinationWarehouse.accurateWarehouseId,
    detailItem: inventoryItems.map((it) => {
      const sentQty     = Number(it.qty);
      const receivedQty = it.receivedQty != null ? Number(it.receivedQty) : sentQty;
      const rejectedQty = Math.max(0, sentQty - receivedQty);
      return {
        itemId:                  it.item.accurateItemId,
        quantity:                receivedQty,
        unitId:                  it.item.defaultUnit?.accurateUnitId,
        fromItemTransferDetailId: it.accurateDetailId ?? undefined,
        ...(rejectedQty > 0 ? { rejectedQuantity: rejectedQty } : {}),
      };
    }),
  };

  logger.info("[transfer receive sync payload]", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_ITEM_TRANSFER_SAVE, {
    method: "POST",
    body:   payload,
  });

  logger.info("[transfer receive sync response]", JSON.stringify(response));

  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateReceiveId     = response.r.id;
  const accurateReceiveNumber = response.r.number ?? response.r.no ?? null;

  await markTransferReceiveSynced({ id: transferId, accurateReceiveId, accurateReceiveNumber });

  logger.info(
    `[transfer receive sync] success transferId=${transferId}` +
    ` accurateId=${accurateReceiveId} number=${accurateReceiveNumber}`
  );

  return { synced: true, accurateReceiveId, accurateReceiveNumber };
};

module.exports = { syncTransferToAccurate, syncTransferReceiveToAccurate };
