const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma          = require("../../config/prisma");
const repo            = require("./stockTransfer.repository");
const { createSyncJob } = require("../syncQueue/syncQueue.service");

const D = (v) => new Prisma.Decimal(String(v));

// ── Transfer number generator: TRF-YYYYMMDD-XXXX ─────────────────────
const buildTransferNo = async () => {
  const today    = new Date();
  const yyyy     = today.getFullYear();
  const mm       = String(today.getMonth() + 1).padStart(2, "0");
  const dd       = String(today.getDate()).padStart(2, "0");
  const prefix   = `TRF-${yyyy}${mm}${dd}-`;
  const maxSeq   = await repo.findMaxSeqToday();
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

  const transferNo = await buildTransferNo();

  const transferData = {
    sourceWarehouseId,
    destinationWarehouseId,
    transferNo,
    status:       "PENDING",
    notes:        notes ?? null,
    transferDate: new Date(transferDate),
    createdBy:    userId ?? null,
  };

  const itemData = items.map((i) => ({ itemId: i.itemId, qty: D(i.qty) }));

  return repo.create(transferData, itemData);
};

// ── Update status ─────────────────────────────────────────────────────
const updateStatus = async (id, newStatus) => {
  const transfer = await repo.findById(id);
  if (!transfer) throw new AppError("Transfer tidak ditemukan", StatusCodes.NOT_FOUND);

  const validTransitions = {
    PENDING:    ["IN_TRANSIT"],
    IN_TRANSIT: ["RECEIVED"],
    RECEIVED:   [],
  };

  if (!validTransitions[transfer.status]?.includes(newStatus)) {
    throw new AppError(
      `Tidak bisa mengubah status dari ${transfer.status} ke ${newStatus}`,
      StatusCodes.BAD_REQUEST
    );
  }

  await repo.update(id, { status: newStatus });

  if (newStatus === "IN_TRANSIT") {
    await generateTransferOutMovements(transfer);
  } else if (newStatus === "RECEIVED") {
    await generateTransferInMovements(transfer);
    await createSyncJob({
      entityType: "STOCK_TRANSFER",
      entityId:   id,
      direction:  "APP_TO_ACCURATE",
    });
  }

  return repo.findById(id);
};

// ── Generate TRANSFER_OUT movements (deduct from source warehouse) ────
const generateTransferOutMovements = async (transfer) => {
  await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      const qty = D(item.qty);

      const inv = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: transfer.sourceWarehouseId, itemId: item.itemId } },
        create: { warehouseId: transfer.sourceWarehouseId, itemId: item.itemId, availableQty: 0, reservedQty: 0, minimumQty: 0 },
        update: {},
        select: { availableQty: true },
      });

      const balanceBefore = D(inv.availableQty);
      const balanceAfter  = balanceBefore.sub(qty);

      await tx.stockMovement.create({
        data: {
          warehouseId:   transfer.sourceWarehouseId,
          itemId:        item.itemId,
          type:          "TRANSFER_OUT",
          qty:           qty.negated(),
          balanceBefore,
          balanceAfter,
          referenceType: "STOCK_TRANSFER",
          referenceId:   transfer.id,
          notes:         `Transfer out to ${transfer.destinationWarehouse.name}: ${item.item.name}`,
        },
      });

      await tx.inventory.update({
        where: { warehouseId_itemId: { warehouseId: transfer.sourceWarehouseId, itemId: item.itemId } },
        data:  { availableQty: balanceAfter },
      });
    }
  });
};

// ── Generate TRANSFER_IN movements (add to destination warehouse) ─────
const generateTransferInMovements = async (transfer) => {
  await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      const qty = D(item.qty);

      const inv = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: transfer.destinationWarehouseId, itemId: item.itemId } },
        create: { warehouseId: transfer.destinationWarehouseId, itemId: item.itemId, availableQty: 0, reservedQty: 0, minimumQty: 0 },
        update: {},
        select: { availableQty: true },
      });

      const balanceBefore = D(inv.availableQty);
      const balanceAfter  = balanceBefore.add(qty);

      await tx.stockMovement.create({
        data: {
          warehouseId:   transfer.destinationWarehouseId,
          itemId:        item.itemId,
          type:          "TRANSFER_IN",
          qty,
          balanceBefore,
          balanceAfter,
          referenceType: "STOCK_TRANSFER",
          referenceId:   transfer.id,
          notes:         `Transfer in from ${transfer.sourceWarehouse.name}: ${item.item.name}`,
        },
      });

      await tx.inventory.update({
        where: { warehouseId_itemId: { warehouseId: transfer.destinationWarehouseId, itemId: item.itemId } },
        data:  { availableQty: balanceAfter },
      });
    }
  });
};

module.exports = { getAll, getById, create, updateStatus };
