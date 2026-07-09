const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
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
const getAll = async ({ page = 1, limit = 20, sourceWarehouseId, destinationWarehouseId, status, branchId }) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (sourceWarehouseId)      where.sourceWarehouseId      = sourceWarehouseId;
  if (destinationWarehouseId) where.destinationWarehouseId = destinationWarehouseId;
  if (status)                 where.status                 = status;
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

// ── Update status ─────────────────────────────────────────────────────
const updateStatus = async (id, newStatus, userRole, actingBranchId) => {
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
  if (!BYPASS_ROLES.includes(userRole) && actingBranchId) {
    if (newStatus === "IN_TRANSIT") {
      const srcBranchId = transfer.sourceWarehouse?.branchId;
      if (srcBranchId && srcBranchId !== actingBranchId) {
        throw new AppError("Hanya cabang asal yang bisa mengirim transfer ini", StatusCodes.FORBIDDEN);
      }
    }
    if (newStatus === "RECEIVED") {
      const dstBranchId = transfer.destinationWarehouse?.branchId;
      if (dstBranchId && dstBranchId !== actingBranchId) {
        throw new AppError("Hanya cabang tujuan yang bisa menerima transfer ini", StatusCodes.FORBIDDEN);
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
    await generateTransferInMovements(transfer);
  }

  return repo.findById(id);
};

// ── Generate TRANSFER_OUT movements (deduct from source warehouse) ────
// Status update is inside the transaction — if any movement fails the status stays PENDING
const generateTransferOutMovements = async (transfer) => {
  await validatePeriodOpen(new Date());

  await prisma.$transaction(async (tx) => {
    await tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: "IN_TRANSIT" } });

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

// ── Generate TRANSFER_IN movements (add to destination warehouse) ─────
// Status update is inside the transaction — if any movement fails the status stays IN_TRANSIT
const generateTransferInMovements = async (transfer) => {
  await validatePeriodOpen(new Date());

  await prisma.$transaction(async (tx) => {
    await tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: "RECEIVED" } });

    for (const item of transfer.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      const qty = D(item.qty);

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

module.exports = { getAll, getById, create, updateStatus };
