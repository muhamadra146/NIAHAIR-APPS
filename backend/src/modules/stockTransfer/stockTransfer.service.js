const logger = require('../../utils/logger');
const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { wibDayStart, wibDayEnd }   = require("../../utils/date");
const prisma          = require("../../config/prisma");
const repo            = require("./stockTransfer.repository");
const { createSyncJob } = require("../syncQueue/syncQueue.service");
const { validatePeriodOpen } = require("../inventory/inventory.period.service");

const D = (v) => new Prisma.Decimal(String(v));

// ── Transfer number generator: TRF-YYYYMMDD-XXXX ─────────────────────
// Accepts a transaction client so seq lookup + insert are atomic (Serializable)
const buildTransferNo = async (tx) => {
  const today    = new Date(Date.now() + 7 * 3600 * 1000); // WIB (UTC+7)
  const yyyy     = today.getUTCFullYear();
  const mm       = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd       = String(today.getUTCDate()).padStart(2, "0");
  const prefix   = `TRF-${yyyy}${mm}${dd}-`;
  const maxSeq   = await repo.findMaxSeqToday(prefix, tx);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────
const getAll = async ({ page = 1, limit = 20, sourceWarehouseId, destinationWarehouseId, status, branchId, startDate, endDate, search }) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (sourceWarehouseId)      where.sourceWarehouseId      = sourceWarehouseId;
  if (destinationWarehouseId) where.destinationWarehouseId = destinationWarehouseId;
  if (status)                 where.status                 = status;
  if (search)                 where.transferNo             = { contains: search, mode: "insensitive" };
  if (startDate || endDate) {
    where.transferDate = {};
    if (startDate) where.transferDate.gte = wibDayStart(startDate);
    if (endDate)   where.transferDate.lte = wibDayEnd(endDate);
  }
  if (branchId) {
    where.OR = [
      { sourceWarehouse:      { branchId } },
      { destinationWarehouse: { branchId } },
    ];
  }
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

// ── Single ────────────────────────────────────────────────────────────
const getById = async (id) => {
  const t = await repo.findById(id);
  if (!t) throw new AppError("Transfer tidak ditemukan", StatusCodes.NOT_FOUND);
  return t;
};

// ── Create ────────────────────────────────────────────────────────────
const create = async (body, userId) => {
  const { sourceWarehouseId, destinationWarehouseId, transferDate, notes, items } = body;

  if (sourceWarehouseId === destinationWarehouseId) {
    throw new AppError("Gudang asal dan tujuan tidak boleh sama", StatusCodes.BAD_REQUEST);
  }
  if (!items || items.length === 0) {
    throw new AppError("Minimal 1 item harus ditambahkan", StatusCodes.BAD_REQUEST);
  }

  const [srcWh, dstWh] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: sourceWarehouseId } }),
    prisma.warehouse.findUnique({ where: { id: destinationWarehouseId } }),
  ]);
  if (!srcWh) throw new AppError("Gudang asal tidak ditemukan", StatusCodes.NOT_FOUND);
  if (!dstWh) throw new AppError("Gudang tujuan tidak ditemukan", StatusCodes.NOT_FOUND);

  const transferData = {
    sourceWarehouseId,
    destinationWarehouseId,
    status:       "PENDING",
    notes:        notes ?? null,
    transferDate: new Date(transferDate),
    createdBy:    userId ?? null,
  };

  const itemData = items.map((i) => ({ itemId: i.itemId, qty: D(i.qty) }));

  // Serializable isolation ensures the seq read + insert are atomic — prevents duplicate transferNo
  return prisma.$transaction(
    async (tx) => {
      const transferNo = await buildTransferNo(tx);
      return repo.create({ ...transferData, transferNo }, itemData, tx);
    },
    { isolationLevel: "Serializable" },
  );
};

const BYPASS_ROLES = ["SUPER_ADMIN", "OWNER"];
// Gudang tanpa cabang hanya boleh diproses oleh peran pusat (G4-21)
const NO_BRANCH_ROLES = [...BYPASS_ROLES, "INVENTORY"];

// ── Helper: cek wewenang cabang atas gudang transfer ──────────────────
const assertBranchAccess = (userRole, actingBranchId, warehouseBranchId, message) => {
  if (BYPASS_ROLES.includes(userRole)) return;
  if (!warehouseBranchId) {
    if (!NO_BRANCH_ROLES.includes(userRole)) {
      throw new AppError(
        "Gudang tanpa cabang hanya bisa diproses oleh Owner atau tim Inventory",
        StatusCodes.FORBIDDEN,
      );
    }
    return;
  }
  if (actingBranchId && warehouseBranchId !== actingBranchId) {
    throw new AppError(message, StatusCodes.FORBIDDEN);
  }
};

// ── Helper: transisi status bersyarat (guard race condition) ─────────
// updateMany dengan where status lama — jika request paralel sudah memproses
// dokumen ini lebih dulu, count = 0 dan transaksi dibatalkan.
const transitionStatus = async (tx, id, fromStatus, data) => {
  const { count } = await tx.stockTransfer.updateMany({ where: { id, status: fromStatus }, data });
  if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);
};

// ── Update status ─────────────────────────────────────────────────────
const updateStatus = async (id, newStatus, userRole, actingBranchId, receivedItems = null) => {
  const transfer = await repo.findById(id);
  if (!transfer) throw new AppError("Transfer tidak ditemukan", StatusCodes.NOT_FOUND);

  const validTransitions = {
    PENDING:    ["IN_TRANSIT"],
    IN_TRANSIT: ["RECEIVED"],
    RECEIVED:   [],
  };

  if (!validTransitions[transfer.status]) {
    throw new AppError(
      `Status transfer "${transfer.status}" tidak dikenali`,
      StatusCodes.BAD_REQUEST
    );
  }

  if (!validTransitions[transfer.status].includes(newStatus)) {
    throw new AppError(
      `Tidak bisa mengubah status dari ${transfer.status} ke ${newStatus}`,
      StatusCodes.BAD_REQUEST
    );
  }

  // Branch authorization — non-super users can only act on their own branch's transfers
  if (newStatus === "IN_TRANSIT") {
    assertBranchAccess(userRole, actingBranchId, transfer.sourceWarehouse?.branchId,
      "Hanya cabang asal yang bisa mengirim transfer ini");
  }
  if (newStatus === "RECEIVED") {
    assertBranchAccess(userRole, actingBranchId, transfer.destinationWarehouse?.branchId,
      "Hanya cabang tujuan yang bisa menerima transfer ini");

    // Qty diterima tidak boleh melebihi qty yang dikirim (G4-07)
    const sentMap = new Map(transfer.items.map((i) => [i.itemId, i]));
    for (const r of receivedItems ?? []) {
      const sent = sentMap.get(r.itemId);
      if (!sent) {
        throw new AppError("Item yang diterima tidak ada di transfer ini", StatusCodes.UNPROCESSABLE_ENTITY);
      }
      if (D(r.receivedQty).greaterThan(D(sent.qty))) {
        throw new AppError(
          `Qty diterima "${sent.item?.name ?? r.itemId}" (${r.receivedQty}) melebihi qty dikirim (${D(sent.qty)})`,
          StatusCodes.UNPROCESSABLE_ENTITY,
        );
      }
    }
  }

  // Status update + stock movements happen in the same transaction inside each generator
  if (newStatus === "IN_TRANSIT") {
    await generateTransferOutMovements(transfer);
    // Sync to Accurate when goods leave source warehouse
    await createSyncJob({
      entityType: "STOCK_TRANSFER",
      entityId:   id,
      direction:  "APP_TO_ACCURATE",
    });
  } else if (newStatus === "RECEIVED") {
    await generateTransferInMovements(transfer, receivedItems);
    // Sync TRANSFER_IN to Accurate when goods are received at destination
    await createSyncJob({
      entityType: "STOCK_TRANSFER_RECEIVE",
      entityId:   id,
      direction:  "APP_TO_ACCURATE",
    });
  }

  return repo.findById(id);
};

// ── Generate TRANSFER_OUT movements (deduct from source warehouse) ────
// Status update is inside the transaction — if any movement fails the status stays PENDING
const generateTransferOutMovements = async (transfer) => {
  await validatePeriodOpen(new Date());

  await prisma.$transaction(async (tx) => {
    await transitionStatus(tx, transfer.id, "PENDING", { status: "IN_TRANSIT" });

    for (const item of transfer.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      const qty = D(item.qty);

      const inventory = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: transfer.sourceWarehouseId, itemId: item.itemId } },
        create: { warehouseId: transfer.sourceWarehouseId, itemId: item.itemId, qtyOnHand: 0, qtyReserved: 0, qtyAvailable: 0 },
        update: {},
        select: { id: true, qtyOnHand: true, qtyReserved: true, qtyAvailable: true },
      });

      const qtyBefore = D(inventory.qtyOnHand);
      const qtyAfter  = qtyBefore.sub(qty);

      if (qtyAfter.lessThan(0)) {
        throw new AppError(
          `Stok "${item.item.name}" tidak mencukupi. Tersedia: ${qtyBefore}, dibutuhkan: ${qty}`,
          StatusCodes.BAD_REQUEST,
        );
      }

      await tx.inventoryMovement.create({
        data: {
          inventoryId:   inventory.id,
          movementType:  "TRANSFER_OUT",
          sourceModule:  "TRANSFER",
          createdSource: "USER",
          warehouseId:   transfer.sourceWarehouseId,
          qtyBefore,
          qtyChange:     qty.negated(),
          qtyAfter,
          referenceType: "TRANSFER",
          referenceId:   transfer.id,
          referenceNo:   transfer.transferNo,
          notes:         `Transfer out to ${transfer.destinationWarehouse.name}: ${item.item.name}`,
        },
      });

      const reservedOut  = D(inventory.qtyReserved ?? 0);
      const availableOut = qtyAfter.sub(reservedOut);
      await tx.inventory.update({
        where: { id: inventory.id },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: availableOut },
      });
    }
  });
};

// ── Helper: tulis satu movement transfer + update saldo inventory ────
// qtyChange bertanda (+ masuk, − keluar). Stok dibaca di dalam tx.
// Jika stok jadi minus dan insufficientMessage diisi → 400.
const applyTransferMovement = async (tx, { transfer, item, warehouseId, movementType, qtyChange, notes, insufficientMessage }) => {
  const inventory = await tx.inventory.upsert({
    where:  { warehouseId_itemId: { warehouseId, itemId: item.itemId } },
    create: { warehouseId, itemId: item.itemId, qtyOnHand: 0, qtyReserved: 0, qtyAvailable: 0 },
    update: {},
    select: { id: true, qtyOnHand: true, qtyReserved: true, qtyAvailable: true },
  });

  const qtyBefore = D(inventory.qtyOnHand);
  const qtyAfter  = qtyBefore.add(qtyChange);

  if (insufficientMessage && qtyAfter.lessThan(0)) {
    throw new AppError(
      `${insufficientMessage}. Tersedia: ${Number(qtyBefore).toLocaleString("id-ID")}, dibutuhkan: ${Number(qtyChange.abs()).toLocaleString("id-ID")}`,
      StatusCodes.BAD_REQUEST,
    );
  }

  await tx.inventoryMovement.create({
    data: {
      inventoryId:   inventory.id,
      movementType,
      sourceModule:  "TRANSFER",
      createdSource: "USER",
      warehouseId,
      qtyBefore,
      qtyChange,
      qtyAfter,
      referenceType: "TRANSFER",
      referenceId:   transfer.id,
      referenceNo:   transfer.transferNo,
      notes,
    },
  });

  await tx.inventory.update({
    where: { id: inventory.id },
    data:  { qtyOnHand: qtyAfter, qtyAvailable: qtyAfter.sub(D(inventory.qtyReserved ?? 0)) },
  });
};

// ── Generate TRANSFER_IN movements (add to destination warehouse) ─────
// receivedItems: [{ itemId, receivedQty }] — if provided, use receivedQty instead of qty
// Status update is inside the transaction — if any movement fails the status stays IN_TRANSIT
const generateTransferInMovements = async (transfer, receivedItems = null) => {
  await validatePeriodOpen(new Date());

  // Build lookup map: itemId → receivedQty (if user specified)
  const receivedMap = new Map(
    (receivedItems ?? []).map((r) => [r.itemId, D(r.receivedQty)])
  );

  await prisma.$transaction(async (tx) => {
    await transitionStatus(tx, transfer.id, "IN_TRANSIT", { status: "RECEIVED" });

    for (const item of transfer.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      // Use receivedQty if provided, otherwise fall back to original qty
      const qty = receivedMap.has(item.itemId) ? receivedMap.get(item.itemId) : D(item.qty);

      // Save receivedQty BEFORE the skip-if-zero guard so that items explicitly
      // received with qty=0 (partial receive) store 0 instead of staying NULL.
      // NULL would cause syncTransferReceiveToAccurate to fall back to sentQty (wrong).
      await tx.$executeRawUnsafe(
        `UPDATE "stock_transfer_items" SET "receivedQty" = $1 WHERE id = $2`,
        qty.toFixed(6),
        item.id,
      );

      // Sisa yang dikirim tapi tidak diterima → dikembalikan ke gudang asal (G4-23, keputusan owner)
      const shortfall = D(item.qty).sub(qty);
      if (shortfall.greaterThan(0)) {
        await applyTransferMovement(tx, {
          transfer,
          item,
          warehouseId:  transfer.sourceWarehouseId,
          movementType: "TRANSFER_IN",
          qtyChange:    shortfall,
          notes:        `Pengembalian sisa transfer (tidak diterima di ${transfer.destinationWarehouse.name}): ${item.item.name}`,
        });
      }

      if (qty.lessThanOrEqualTo(0)) continue;

      const inventory = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: transfer.destinationWarehouseId, itemId: item.itemId } },
        create: { warehouseId: transfer.destinationWarehouseId, itemId: item.itemId, qtyOnHand: 0, qtyReserved: 0, qtyAvailable: 0 },
        update: {},
        select: { id: true, qtyOnHand: true, qtyReserved: true, qtyAvailable: true },
      });

      const qtyBefore = D(inventory.qtyOnHand);
      const qtyAfter  = qtyBefore.add(qty);

      await tx.inventoryMovement.create({
        data: {
          inventoryId:   inventory.id,
          movementType:  "TRANSFER_IN",
          sourceModule:  "TRANSFER",
          createdSource: "USER",
          warehouseId:   transfer.destinationWarehouseId,
          qtyBefore,
          qtyChange:     qty,
          qtyAfter,
          referenceType: "TRANSFER",
          referenceId:   transfer.id,
          referenceNo:   transfer.transferNo,
          notes:         `Transfer in from ${transfer.sourceWarehouse.name}: ${item.item.name}`,
        },
      });

      const reservedIn  = D(inventory.qtyReserved ?? 0);
      const availableIn = qtyAfter.sub(reservedIn);
      await tx.inventory.update({
        where: { id: inventory.id },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: availableIn },
      });
    }
  });
};

// ── Delete transfer ────────────────────────────────────────────────────
// PENDING  → hard delete (no movements exist)
// IN_TRANSIT → reversal movements at source + delete Accurate TRANSFER_OUT + CANCELLED
const deleteTransfer = async (id, userRole, actingBranchId) => {
  const transfer = await repo.findById(id);
  if (!transfer) throw new AppError("Transfer tidak ditemukan", StatusCodes.NOT_FOUND);

  if (transfer.status === "RECEIVED") {
    throw new AppError(
      "Transfer sudah diterima. Batalkan penerimaan dari gudang tujuan terlebih dahulu",
      StatusCodes.BAD_REQUEST,
    );
  }
  if (transfer.status === "CANCELLED") {
    throw new AppError("Transfer sudah dibatalkan", StatusCodes.BAD_REQUEST);
  }

  // Authorization: only source branch (or super user)
  assertBranchAccess(userRole, actingBranchId, transfer.sourceWarehouse?.branchId,
    "Hanya cabang asal yang bisa menghapus transfer ini");

  if (transfer.status === "PENDING") {
    // No movements — safe to hard delete.
    // deleteMany bersyarat status PENDING: jika paralel sudah dikirim (IN_TRANSIT), batalkan.
    await prisma.$transaction(async (tx) => {
      await tx.stockTransferItem.deleteMany({ where: { transferId: id } });
      const { count } = await tx.stockTransfer.deleteMany({ where: { id, status: "PENDING" } });
      if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);
    });
    return { deleted: true };
  }

  // IN_TRANSIT — create reversal movements, delete Accurate, mark CANCELLED
  await validatePeriodOpen(new Date());

  // Delete Accurate TRANSFER_OUT (best effort)
  if (transfer.accurateTransferId) {
    try {
      const { accurateRequest } = require("../accurate/accurate.client");
      await accurateRequest(`/item-transfer/delete.do?id=${transfer.accurateTransferId}`, { method: "DELETE" });
    } catch (err) {
      logger.warn(`[delete transfer] Accurate delete failed (ignored): ${err.message}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await transitionStatus(tx, id, "IN_TRANSIT", {
      status:                "CANCELLED",
      accurateTransferId:    null,
      accurateTransferNumber: null,
    });

    for (const item of transfer.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      const qty = D(item.qty);

      // Reversal: return stock to source warehouse
      const inventory = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: transfer.sourceWarehouseId, itemId: item.itemId } },
        create: { warehouseId: transfer.sourceWarehouseId, itemId: item.itemId, qtyOnHand: 0, qtyReserved: 0, qtyAvailable: 0 },
        update: {},
        select: { id: true, qtyOnHand: true, qtyReserved: true, qtyAvailable: true },
      });

      const qtyBefore = D(inventory.qtyOnHand);
      const qtyAfter  = qtyBefore.add(qty);

      await tx.inventoryMovement.create({
        data: {
          inventoryId:   inventory.id,
          movementType:  "TRANSFER_IN",
          sourceModule:  "TRANSFER",
          createdSource: "USER",
          warehouseId:   transfer.sourceWarehouseId,
          qtyBefore,
          qtyChange:     qty,
          qtyAfter,
          referenceType: "TRANSFER",
          referenceId:   transfer.id,
          referenceNo:   transfer.transferNo,
          notes:         `Pembatalan transfer ke ${transfer.destinationWarehouse.name}: ${item.item.name}`,
        },
      });

      const reserved   = D(inventory.qtyReserved ?? 0);
      const available  = qtyAfter.sub(reserved);
      await tx.inventory.update({
        where: { id: inventory.id },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: available },
      });
    }
  });

  return { cancelled: true };
};

// ── Undo Receive ───────────────────────────────────────────────────────
// RECEIVED → reversal movements at destination + clear Accurate TRANSFER_IN + back to IN_TRANSIT
const undoReceive = async (id, userRole, actingBranchId) => {
  const transfer = await repo.findById(id);
  if (!transfer) throw new AppError("Transfer tidak ditemukan", StatusCodes.NOT_FOUND);

  if (transfer.status !== "RECEIVED") {
    throw new AppError(
      `Hanya transfer dengan status RECEIVED yang bisa dibatalkan penerimaannya, saat ini: ${transfer.status}`,
      StatusCodes.BAD_REQUEST,
    );
  }

  // Authorization: only destination branch (or super user)
  assertBranchAccess(userRole, actingBranchId, transfer.destinationWarehouse?.branchId,
    "Hanya cabang tujuan yang bisa membatalkan penerimaan ini");

  await validatePeriodOpen(new Date());

  // Delete Accurate TRANSFER_IN (best effort)
  const syncRepo = require("./stockTransfer.sync.repository");
  const accurateReceiveId = await syncRepo.findReceiveAccurateId(id);
  if (accurateReceiveId) {
    try {
      const { accurateRequest } = require("../accurate/accurate.client");
      await accurateRequest(`/item-transfer/delete.do?id=${accurateReceiveId}`, { method: "DELETE" });
    } catch (err) {
      logger.warn(`[undo receive] Accurate delete TRANSFER_IN failed (ignored): ${err.message}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    // Revert status and clear Accurate receive fields — bersyarat status RECEIVED (guard paralel)
    const reverted = await tx.$executeRawUnsafe(
      `UPDATE "stock_transfers"
       SET status = 'IN_TRANSIT', "accurateReceiveId" = NULL, "accurateReceiveNumber" = NULL, "lastReceiveSyncAt" = NULL
       WHERE id = $1 AND status = 'RECEIVED'`,
      id,
    );
    if (reverted === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);

    // Fetch receivedQty per item di dalam transaksi, setelah guard status (new field, not in Prisma client SELECT)
    const receivedQtyRows = await tx.$queryRawUnsafe(
      `SELECT id, "receivedQty", qty FROM "stock_transfer_items" WHERE "transferId" = $1`,
      id,
    );
    const receivedQtyMap = new Map(
      receivedQtyRows.map((r) => [r.id, r.receivedQty != null ? D(r.receivedQty) : null]),
    );

    // Reset receivedQty on items
    await tx.$executeRawUnsafe(
      `UPDATE "stock_transfer_items" SET "receivedQty" = NULL WHERE "transferId" = $1`,
      id,
    );

    const shortfallHandled = new Set();

    for (const item of transfer.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      // Tarik kembali sisa yang dulu dikembalikan ke gudang asal saat receive parsial (G4-23).
      // Dihitung dari movement aktual: net movement transfer ini di gudang asal + total qty dikirim.
      // Data lama (sebelum aturan ini) → hasil 0, tidak ada yang ditarik.
      if (!shortfallHandled.has(item.itemId)) {
        shortfallHandled.add(item.itemId);
        const agg = await tx.inventoryMovement.aggregate({
          _sum:  { qtyChange: true },
          where: {
            referenceType: "TRANSFER",
            referenceId:   transfer.id,
            warehouseId:   transfer.sourceWarehouseId,
            inventory:     { itemId: item.itemId },
          },
        });
        const sentTotal = transfer.items
          .filter((i) => i.itemId === item.itemId)
          .reduce((s, i) => s.add(D(i.qty)), D(0));
        const outstanding = D(agg?._sum?.qtyChange ?? 0).add(sentTotal);
        if (outstanding.greaterThan(0)) {
          await applyTransferMovement(tx, {
            transfer,
            item,
            warehouseId:         transfer.sourceWarehouseId,
            movementType:        "TRANSFER_OUT",
            qtyChange:           outstanding.negated(),
            notes:               `Pembatalan pengembalian sisa transfer: ${item.item.name}`,
            insufficientMessage: `Stok "${item.item.name}" di gudang asal tidak mencukupi untuk dibatalkan`,
          });
        }
      }

      // Use pre-fetched receivedQty, fall back to item.qty
      const receivedQty = receivedQtyMap.get(item.id);
      const qty = receivedQty ?? D(item.qty);
      if (qty.lessThanOrEqualTo(0)) continue;

      // Reversal: remove stock from destination warehouse
      const inventory = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: transfer.destinationWarehouseId, itemId: item.itemId } },
        create: { warehouseId: transfer.destinationWarehouseId, itemId: item.itemId, qtyOnHand: 0, qtyReserved: 0, qtyAvailable: 0 },
        update: {},
        select: { id: true, qtyOnHand: true, qtyReserved: true, qtyAvailable: true },
      });

      const qtyBefore = D(inventory.qtyOnHand);
      const qtyAfter  = qtyBefore.sub(qty);

      if (qtyAfter.lessThan(0)) {
        throw new AppError(
          `Stok "${item.item.name}" di gudang tujuan tidak mencukupi untuk dibatalkan. ` +
          `Tersedia: ${Number(qtyBefore).toLocaleString("id-ID")}, dibutuhkan: ${Number(qty).toLocaleString("id-ID")}`,
          StatusCodes.BAD_REQUEST,
        );
      }

      await tx.inventoryMovement.create({
        data: {
          inventoryId:   inventory.id,
          movementType:  "TRANSFER_OUT",
          sourceModule:  "TRANSFER",
          createdSource: "USER",
          warehouseId:   transfer.destinationWarehouseId,
          qtyBefore,
          qtyChange:     qty.negated(),
          qtyAfter,
          referenceType: "TRANSFER",
          referenceId:   transfer.id,
          referenceNo:   transfer.transferNo,
          notes:         `Pembatalan penerimaan dari ${transfer.sourceWarehouse.name}: ${item.item.name}`,
        },
      });

      const reserved  = D(inventory.qtyReserved ?? 0);
      const available = qtyAfter.sub(reserved);
      await tx.inventory.update({
        where: { id: inventory.id },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: available },
      });
    }
  });

  return repo.findById(id);
};

// ── Manual Accurate Sync ───────────────────────────────────────────────
const syncToAccurate = async (id) => {
  const transfer = await repo.findById(id);
  if (!transfer) throw new AppError("Transfer tidak ditemukan", StatusCodes.NOT_FOUND);

  if (transfer.status === "PENDING" || transfer.status === "CANCELLED") {
    throw new AppError(
      "Hanya transfer IN_TRANSIT atau RECEIVED yang dapat disinkronkan ke Accurate",
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const syncSvc = require("./stockTransfer.sync.service");

  // Error mentah dari sync service (mapping gudang/item, respon Accurate) → 422 dengan pesan aslinya,
  // bukan 500 (G4-16)
  const run = async (fn) => {
    try {
      await fn(id);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Gagal sinkron ke Accurate: ${err.message}`, StatusCodes.UNPROCESSABLE_ENTITY);
    }
  };

  // Sync TRANSFER_OUT jika belum ada accurateTransferId
  if (!transfer.accurateTransferId) {
    await run(syncSvc.syncTransferToAccurate);
  }

  // Sync TRANSFER_IN jika status RECEIVED dan belum ada accurateReceiveId
  if (transfer.status === "RECEIVED" && !transfer.accurateReceiveId) {
    await run(syncSvc.syncTransferReceiveToAccurate);
  }

  return repo.findById(id);
};

module.exports = { getAll, getById, create, updateStatus, deleteTransfer, undoReceive, syncToAccurate };
