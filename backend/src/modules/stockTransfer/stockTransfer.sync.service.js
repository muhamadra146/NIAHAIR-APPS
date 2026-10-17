const logger = require('../../utils/logger');
const { accurateRequest }       = require("../accurate/accurate.client");
const { getAccurateBranchId }   = require("../branch/branch.repository");
const { mapTransferToAccurate } = require("./stockTransfer.sync.mapper");
const {
  findTransferForSync,
  markTransferSynced,
  markTransferReceiveSynced,
  markTransferItemSynced,
  clearTransferOutSynced,
  findReceiveAccurateId,
} = require("./stockTransfer.sync.repository");

const ACCURATE_ITEM_TRANSFER_SAVE   = "/item-transfer/save.do";
const ACCURATE_ITEM_TRANSFER_DETAIL = "/item-transfer/detail.do";
const ACCURATE_ITEM_TRANSFER_DELETE = "/item-transfer/delete.do";

const sentQtyOf     = (it) => Number(it.qty);
const receivedQtyOf = (it) => (it.receivedQty != null ? Number(it.receivedQty) : Number(it.qty));
const inventoryLinesOf = (transfer) => transfer.items.filter((it) => it.item.itemType === "INVENTORY");
// Semua item diterima 0 → tidak ada barang yang berpindah
const isNothingReceived = (transfer) => {
  const lines = inventoryLinesOf(transfer);
  return lines.length > 0 && lines.every((it) => receivedQtyOf(it) <= 0);
};

// ── Samakan qty baris TRANSFER_OUT di Accurate dengan target per item ──
// Dipakai saat receive parsial (target = qty diterima) dan undo receive (target = qty dikirim).
// Dibaca dulu dari Accurate → hanya mengirim perubahan (idempotent, aman diulang).
// Target 0 → baris dihapus (`_status: "delete"`); Accurate mengabaikan quantity 0 secara diam-diam.
// warehouseId + referenceWarehouseId wajib dikirim — tanpa itu Accurate menolak
// ("Tidak dapat mengubah gudang. Sudah ada penerimaan ...").
const setTransferOutQuantities = async (transfer, targetOf) => {
  const detailRes = await accurateRequest(`${ACCURATE_ITEM_TRANSFER_DETAIL}?id=${transfer.accurateTransferId}`);
  if (!detailRes.s || !detailRes.d) {
    throw new Error(`Accurate TRANSFER_OUT detail failed: ${JSON.stringify(detailRes.d ?? detailRes)}`);
  }
  const accLines = detailRes.d.detailItem ?? [];
  const existing = new Map(accLines.map((d) => [d.id, Number(d.quantity)]));

  const lines   = inventoryLinesOf(transfer);
  const detail  = [];
  const added   = [];
  let changed   = false;

  // Baris lokal tanpa detail id yang valid → cocokkan dulu ke baris Accurate yang belum terpakai
  // (item sama) supaya tidak tergandakan.
  const claimed = new Set(lines.map((it) => it.accurateDetailId).filter((id) => existing.has(id)));
  for (const it of lines) {
    if (it.accurateDetailId != null && existing.has(it.accurateDetailId)) continue;
    const match = accLines.find((d) => !claimed.has(d.id) && d.itemId === it.item.accurateItemId);
    if (match) {
      claimed.add(match.id);
      it.accurateDetailId = match.id;
      await markTransferItemSynced(it.id, match.id);
    }
  }

  for (const it of lines) {
    const target = targetOf(it);
    const has    = it.accurateDetailId != null && existing.has(it.accurateDetailId);
    if (has) {
      if (target <= 0) {
        detail.push({ id: it.accurateDetailId, _status: "delete" });
        changed = true;
        continue;
      }
      if (existing.get(it.accurateDetailId) !== target) changed = true;
      detail.push({ id: it.accurateDetailId, itemId: it.item.accurateItemId, unitId: it.item.defaultUnit?.accurateUnitId, quantity: target });
    } else if (target > 0) {
      // Baris pernah dihapus (diterima 0) → tambahkan lagi
      detail.push({ itemId: it.item.accurateItemId, unitId: it.item.defaultUnit?.accurateUnitId, quantity: target });
      added.push(it);
      changed = true;
    }
  }

  if (!changed) return { changed: false };

  const payload = {
    id:                   transfer.accurateTransferId,
    itemTransferType:     "TRANSFER_OUT",
    warehouseId:          transfer.sourceWarehouse.accurateWarehouseId,
    referenceWarehouseId: transfer.destinationWarehouse.accurateWarehouseId,
    detailItem:           detail,
  };
  logger.info("[transfer out adjust payload]", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_ITEM_TRANSFER_SAVE, { method: "POST", body: payload });
  logger.info("[transfer out adjust response]", JSON.stringify(response));
  if (!response.s) {
    throw new Error(`Accurate API error (adjust TRANSFER_OUT): ${JSON.stringify(response.d ?? response)}`);
  }

  // Baris baru → simpan detail id barunya (urutan sama dengan yang dikirim)
  const respDetails = response.r?.detailItem ?? [];
  const newDetails  = respDetails.filter((d) => !existing.has(d.id));
  for (let i = 0; i < added.length; i++) {
    if (newDetails[i]?.id) {
      await markTransferItemSynced(added[i].id, newDetails[i].id);
      added[i].accurateDetailId = newDetails[i].id;
    }
  }

  // Pastikan Accurate benar-benar menyimpan qty target
  const saved = new Map(respDetails.map((d) => [d.id, Number(d.quantity)]));
  for (const it of lines) {
    const target = targetOf(it);
    if (target > 0 && saved.size > 0 && saved.get(it.accurateDetailId) !== target) {
      throw new Error(`Accurate TRANSFER_OUT qty mismatch for item ${it.item.itemCode}: expected ${target}, got ${saved.get(it.accurateDetailId)}`);
    }
  }

  return { changed: true };
};

const assertMappedForAdjust = (transfer) => {
  if (!transfer.sourceWarehouse.accurateWarehouseId) {
    throw new Error(`Source warehouse not mapped to Accurate: ${transfer.sourceWarehouse.name}`);
  }
  if (!transfer.destinationWarehouse.accurateWarehouseId) {
    throw new Error(`Destination warehouse not mapped to Accurate: ${transfer.destinationWarehouse.name}`);
  }
};

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

  // Sudah diterima dengan semua qty 0 → semua kembali ke gudang asal, tidak ada yang perlu dikirim
  if (transfer.status === "RECEIVED" && isNothingReceived(transfer)) {
    return { skipped: true, reason: "Nothing received — all quantities returned to source" };
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

  // Semua item diterima 0 → di ERP semua kembali ke gudang asal. Di Accurate TRANSFER_OUT dihapus
  // (barang tidak pernah pindah) dan referensinya dilepas. Undo receive akan membuatnya lagi.
  if (isNothingReceived(transfer)) {
    if (transfer.accurateTransferId) {
      const del = await accurateRequest(`${ACCURATE_ITEM_TRANSFER_DELETE}?id=${transfer.accurateTransferId}`, { method: "DELETE" });
      logger.info("[transfer receive sync] nothing received — delete TRANSFER_OUT", JSON.stringify(del));
      if (!del.s) {
        // Sudah tidak ada di Accurate → anggap beres; selain itu gagal
        const exists = await accurateRequest(`${ACCURATE_ITEM_TRANSFER_DETAIL}?id=${transfer.accurateTransferId}`);
        if (exists.s) throw new Error(`Accurate API error (delete TRANSFER_OUT): ${JSON.stringify(del.d ?? del)}`);
      }
      await clearTransferOutSynced(transferId);
    }
    return { synced: true, outDeleted: true };
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

  const inventoryItems = inventoryLinesOf(transfer);
  if (inventoryItems.length === 0) {
    throw new Error("Transfer has no INVENTORY items to sync");
  }

  // Receive parsial: sisa yang tidak diterima kembali ke gudang asal (G4-23).
  // Accurate mengabaikan rejectedQuantity (sisa tertahan di "Transit (AOL System)") dan
  // TRANSFER_IN selalu masuk ke gudang tujuan — jadi qty TRANSFER_OUT disamakan dengan qty diterima.
  // Hasil bersih sama dengan ERP: asal −diterima, tujuan +diterima, transit 0.
  // Dilakukan SEBELUM TRANSFER_IN supaya retry (bila TRANSFER_IN gagal) tetap mengulang penyesuaian.
  if (inventoryItems.some((it) => receivedQtyOf(it) < sentQtyOf(it))) {
    assertMappedForAdjust(transfer);
    await setTransferOutQuantities(transfer, receivedQtyOf);
  }

  // Build TRANSFER_IN payload — references each TRANSFER_OUT detail line by fromItemTransferDetailId.
  // Baris yang diterima 0 sudah dihapus dari TRANSFER_OUT → tidak ikut.
  const payload = {
    itemTransferType:   "TRANSFER_IN",
    fromItemTransferId: transfer.accurateTransferId,
    warehouseId:        transfer.destinationWarehouse.accurateWarehouseId,
    detailItem: inventoryItems
      .filter((it) => receivedQtyOf(it) > 0)
      .map((it) => ({
        itemId:                   it.item.accurateItemId,
        quantity:                 receivedQtyOf(it),
        unitId:                   it.item.defaultUnit?.accurateUnitId,
        fromItemTransferDetailId: it.accurateDetailId ?? undefined,
      })),
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

// ── Undo receive: kembalikan qty TRANSFER_OUT di Accurate ke qty dikirim ──
// Pasangan dari penyesuaian receive parsial. Idempotent (hanya mengirim perubahan).
const restoreTransferOutInAccurate = async (transferId) => {
  const transfer = await findTransferForSync(transferId);
  if (!transfer) throw new Error(`Stock transfer not found: ${transferId}`);
  if (!transfer.accurateTransferId) return { skipped: true, reason: "TRANSFER_OUT not synced" };
  assertMappedForAdjust(transfer);
  return setTransferOutQuantities(transfer, sentQtyOf);
};

module.exports = { syncTransferToAccurate, syncTransferReceiveToAccurate, restoreTransferOutInAccurate };
