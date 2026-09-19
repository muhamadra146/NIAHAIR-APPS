const { Prisma, ProductionStatus } = require("@prisma/client");
const { StatusCodes }              = require("http-status-codes");
const AppError                     = require("../../common/errors/AppError");
const prisma                       = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo                         = require("./production.repository");
const { syncProductionToAccurate, deleteFromAccurate } = require("./production.sync.service");

// ── Decimal helper ────────────────────────────────────────────────────────────
const D = (v) => new Prisma.Decimal(String(v));

// ── Production number generator ───────────────────────────────────────────────
// Format: PROD-YYYYMMDD-0001
// Gunakan WIB (UTC+7) agar nomor urut tidak salah tanggal saat tengah malam UTC.
const buildProductionNo = async (tx) => {
  const now    = new Date(Date.now() + 7 * 60 * 60 * 1000); // UTC → WIB
  const y      = now.getUTCFullYear();
  const m      = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d      = String(now.getUTCDate()).padStart(2, "0");
  const prefix = `PROD-${y}${m}${d}-`;
  const seq    = await repo.findMaxSeqToday(prefix, tx);
  return `${prefix}${String(seq + 1).padStart(4, "0")}`;
};

// ── Status transition table ───────────────────────────────────────────────────
// QC → COMPLETED: hanya bisa via submitQC (PASS auto-complete).
// QC → CANCELLED: operator bisa batalkan langsung dari UI saat di QC.
const ALLOWED_TRANSITIONS = {
  DRAFT:       ["RELEASED", "CANCELLED"],
  RELEASED:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["QC", "CANCELLED"],
  QC:          ["COMPLETED", "CANCELLED"],
  COMPLETED:   [],
  CANCELLED:   [],
};

// ── getAll ────────────────────────────────────────────────────────────────────
const getAll = async ({ page = 1, limit = 20, status, branchId, warehouseId, startDate, endDate } = {}) => {
  const { skip, take } = paginate(page, limit);

  const where = {};
  if (status)     where.status   = status;
  if (branchId)   where.branchId = branchId;
  if (warehouseId) where.warehouseId = warehouseId;
  if (startDate || endDate) {
    where.productionDate = {};
    if (startDate) where.productionDate.gte = new Date(startDate);
    if (endDate)   where.productionDate.lte = new Date(endDate);
  }

  const [rows, total] = await Promise.all([
    repo.findAll({ skip, take, where }),
    repo.count(where),
  ]);

  return { data: rows, meta: paginationMeta(total, page, limit) };
};

// ── getById ───────────────────────────────────────────────────────────────────
const getById = async (id) => {
  const order = await repo.findById(id);
  if (!order) throw new AppError("Production order tidak ditemukan", StatusCodes.NOT_FOUND);
  return order;
};

// ── create ────────────────────────────────────────────────────────────────────
const create = async ({ branchId, warehouseId, productionDate, plannedStartAt, plannedFinishAt, notes, items, materials, employees }, employeeId) => {
  if (!items?.length)     throw new AppError("Minimal 1 finished goods item wajib diisi", StatusCodes.BAD_REQUEST);
  if (!materials?.length) throw new AppError("Minimal 1 material wajib diisi", StatusCodes.BAD_REQUEST);

  // Validasi alokasi biaya per-item > 0 dan total = 100 (wajib untuk sync ke Accurate)
  // Gunakan parseFloat(String()) agar aman untuk string, number, dan Prisma.Decimal.
  // ??(nullish) sengaja TIDAK dipakai — "" ?? 100 = "" (bukan 100), pakai || sebagai fallback.
  for (const it of items) {
    const alloc = parseFloat(String(it.costAllocationPercentage ?? "")) || 0;
    if (alloc <= 0) {
      throw new AppError(
        `Alokasi biaya setiap barang jadi harus lebih dari 0%. ` +
        `Isi porsi alokasi untuk semua item.`,
        StatusCodes.BAD_REQUEST,
      );
    }
  }
  const totalAlloc = items.reduce(
    (s, it) => s + (parseFloat(String(it.costAllocationPercentage ?? "")) || 0), 0,
  );
  if (Math.abs(totalAlloc - 100) > 0.01) {
    throw new AppError(
      `Total alokasi biaya harus 100%. Saat ini: ${totalAlloc.toFixed(2)}%. ` +
      `Pastikan total porsi alokasi seluruh barang jadi = 100%.`,
      StatusCodes.BAD_REQUEST,
    );
  }

  return prisma.$transaction(async (tx) => {
    const productionNo = await buildProductionNo(tx);

    const order = await repo.create({
      productionNo,
      branchId,
      warehouseId,
      productionDate: new Date(productionDate),
      plannedStartAt:  plannedStartAt  ? new Date(plannedStartAt)  : undefined,
      plannedFinishAt: plannedFinishAt ? new Date(plannedFinishAt) : undefined,
      notes:           notes ?? null,
      status:          "DRAFT",
      createdByEmployeeId: employeeId ?? null,
      items: {
        create: items.map((it) => ({
          itemId:                   it.itemId,
          unitId:                   it.unitId,
          plannedQuantity:          D(it.plannedQuantity),
          producedQuantity:         D("0"),
          costAllocationPercentage: D(parseFloat(String(it.costAllocationPercentage ?? "")) || 100),
        })),
      },
      materials: {
        create: materials.map((m) => ({
          itemId:          m.itemId,
          warehouseId:     m.warehouseId ?? warehouseId,
          unitId:          m.unitId,
          plannedQuantity: D(m.plannedQuantity),
          actualQuantity:  D("0"),
          wasteQuantity:   D("0"),
        })),
      },
      ...(employees?.length ? {
        employees: {
          create: employees.map((e) => ({
            employeeId:   e.employeeId,
            role:         e.role ?? "OPERATOR",
            workingHours: e.workingHours ? D(e.workingHours) : null,
            notes:        e.notes ?? null,
          })),
        },
      } : {}),
    }, tx);

    await repo.addTimeline({
      productionOrderId:   order.id,
      timelineType:        "CREATED",
      description:         `Production order ${productionNo} dibuat`,
      createdByEmployeeId: employeeId ?? null,
    }, tx);

    return order;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

// ── updateStatus ──────────────────────────────────────────────────────────────
const updateStatus = async (id, newStatus, employeeId) => {
  const order = await getById(id);

  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Tidak dapat berpindah dari ${order.status} ke ${newStatus}`,
      StatusCodes.BAD_REQUEST,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updateData = { status: newStatus };

    // ── IN_PROGRESS: set actualStartAt + consume materials ─────────────────
    if (newStatus === "IN_PROGRESS") {
      updateData.actualStartAt = new Date();
      await consumeMaterials(order, employeeId, tx);
    }

    // ── COMPLETED: set actualFinishAt (QC must PASS first) ─────────────────
    if (newStatus === "COMPLETED") {
      const lastQC = order.qcRecords?.[0];
      if (!lastQC || lastQC.status !== "PASS") {
        throw new AppError(
          "Production order harus memiliki QC berstatus PASS sebelum di-complete",
          StatusCodes.BAD_REQUEST,
        );
      }
      updateData.actualFinishAt = new Date();
      await addFinishedGoods(order, employeeId, tx);
    }

    // ── CANCELLED ───────────────────────────────────────────────────────────
    if (newStatus === "CANCELLED") {
      // If materials were already consumed, we do NOT auto-reverse them here.
      // A manual adjustment is needed. Log a timeline note instead.
      if (order.status === "IN_PROGRESS" || order.status === "QC") {
        await repo.addTimeline({
          productionOrderId:   id,
          timelineType:        "CANCELLED",
          description:         "Dibatalkan setelah material dikonsumsi — lakukan penyesuaian stok manual jika diperlukan",
          createdByEmployeeId: employeeId ?? null,
        }, tx);
      }
    }

    const updated = await repo.update(id, updateData, tx);

    // Always add timeline (unless CANCELLED was already added above)
    if (newStatus !== "CANCELLED" || (order.status !== "IN_PROGRESS" && order.status !== "QC")) {
      const tlType = {
        RELEASED:    "RELEASED",
        IN_PROGRESS: "STARTED",
        QC:          "QC_SUBMITTED",
        COMPLETED:   "COMPLETED",
        CANCELLED:   "CANCELLED",
      }[newStatus];

      await repo.addTimeline({
        productionOrderId:   id,
        timelineType:        tlType,
        description:         `Status berubah ke ${newStatus}`,
        createdByEmployeeId: employeeId ?? null,
      }, tx);
    }

    return updated;
  });

  // ── Auto-sync ke Accurate saat COMPLETED ─────────────────────────────────
  // Dilakukan DI LUAR transaksi agar rollback inventory tidak rollback sync.
  // Non-blocking: error dicatat di log, tidak di-throw ke client.
  if (newStatus === "COMPLETED") {
    syncProductionToAccurate(id).catch((err) => {
      console.error(`[production] Auto-sync Accurate gagal untuk ${id}:`, err?.message ?? err);
    });
  }

  return result;
};

// ── consumeMaterials ──────────────────────────────────────────────────────────
// Called when status → IN_PROGRESS. Creates PRODUCTION OUT movements.
const consumeMaterials = async (order, employeeId, tx) => {
  for (const mat of order.materials) {
    // Idempotent: skip if already has a movement
    if (mat.inventoryMovementId) continue;

    const qtyToConsume = D(mat.plannedQuantity);

    // Find or create inventory record
    const inventory = await tx.inventory.upsert({
      where:  { warehouseId_itemId: { warehouseId: mat.warehouseId, itemId: mat.itemId } },
      create: { warehouseId: mat.warehouseId, itemId: mat.itemId, qtyOnHand: D("0"), qtyReserved: D("0"), qtyAvailable: D("0") },
      update: {},
      select: { id: true, qtyOnHand: true, qtyReserved: true },
    });

    const qtyBefore    = D(inventory.qtyOnHand);
    const qtyChange    = qtyToConsume.negated();
    const qtyAfter     = qtyBefore.plus(qtyChange);
    const newAvailable = D(qtyAfter).minus(D(inventory.qtyReserved));

    const movement = await tx.inventoryMovement.create({
      data: {
        inventoryId:         inventory.id,
        movementType:        "PRODUCTION",
        sourceModule:        "PRODUCTION",
        createdSource:       "SYSTEM",
        warehouseId:         mat.warehouseId,
        qtyBefore,
        qtyChange,
        qtyAfter,
        referenceType:       "PRODUCTION",
        referenceId:         mat.id,
        referenceNo:         order.productionNo,
        notes:               `Material konsumsi: ${mat.item.name}`,
        createdByEmployeeId: employeeId ?? null,
      },
      select: { id: true },
    });

    // Update inventory balance
    await tx.inventory.update({
      where: { id: inventory.id },
      data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
    });

    // Link movement back to material
    await tx.productionMaterial.update({
      where: { id: mat.id },
      data:  {
        actualQuantity:     qtyToConsume,
        inventoryMovementId: movement.id,
      },
    });
  }

  await repo.addTimeline({
    productionOrderId:   order.id,
    timelineType:        "MATERIAL_ISSUED",
    description:         `${order.materials.length} material dikonsumsi`,
    createdByEmployeeId: employeeId ?? null,
  }, tx);
};

// ── addFinishedGoods ──────────────────────────────────────────────────────────
// Called when status → COMPLETED. Creates PRODUCTION IN movements.
const addFinishedGoods = async (order, employeeId, tx) => {
  for (const pItem of order.items) {
    if (pItem.inventoryMovementId) continue;

    const qtyToAdd = D(pItem.plannedQuantity);

    // Finished goods go into the production order's warehouse
    const inventory = await tx.inventory.upsert({
      where:  { warehouseId_itemId: { warehouseId: order.warehouseId, itemId: pItem.itemId } },
      create: { warehouseId: order.warehouseId, itemId: pItem.itemId, qtyOnHand: D("0"), qtyReserved: D("0"), qtyAvailable: D("0") },
      update: {},
      select: { id: true, qtyOnHand: true, qtyReserved: true },
    });

    const qtyBefore    = D(inventory.qtyOnHand);
    const qtyChange    = qtyToAdd;
    const qtyAfter     = qtyBefore.plus(qtyChange);
    const newAvailable = D(qtyAfter).minus(D(inventory.qtyReserved));

    const movement = await tx.inventoryMovement.create({
      data: {
        inventoryId:         inventory.id,
        movementType:        "PRODUCTION",
        sourceModule:        "PRODUCTION",
        createdSource:       "SYSTEM",
        warehouseId:         order.warehouseId,
        qtyBefore,
        qtyChange,
        qtyAfter,
        referenceType:       "PRODUCTION",
        referenceId:         pItem.id,
        referenceNo:         order.productionNo,
        notes:               `Finished goods masuk: ${pItem.item.name}`,
        createdByEmployeeId: employeeId ?? null,
      },
      select: { id: true },
    });

    await tx.inventory.update({
      where: { id: inventory.id },
      data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
    });

    await tx.productionItem.update({
      where: { id: pItem.id },
      data:  {
        producedQuantity:   qtyToAdd,
        inventoryMovementId: movement.id,
      },
    });
  }
};

// ── submitQC ──────────────────────────────────────────────────────────────────
//
// State transitions setelah QC:
//   PASS   → COMPLETED (auto, langsung — addFinishedGoods dipanggil di sini)
//   REWORK → IN_PROGRESS (produksi ulang)
//   REJECT → IN_PROGRESS (operator bisa lanjut batalkan atau produksi ulang)
//
const submitQC = async (id, { status, notes, inspectionDate }, qcEmployeeId) => {
  // Fetch order sebelum transaction agar bisa dipakai oleh addFinishedGoods
  const order = await getById(id);

  if (order.status !== "QC") {
    throw new AppError("QC hanya bisa dilakukan saat status = QC", StatusCodes.BAD_REQUEST);
  }

  // Semua write dalam satu transaction agar konsisten
  const { qcRecord } = await prisma.$transaction(async (tx) => {
    // 1. Buat record QC
    const rec = await tx.productionQC.create({
      data: {
        productionOrderId: id,
        qcEmployeeId:      qcEmployeeId ?? null,
        inspectionDate:    inspectionDate ? new Date(inspectionDate) : new Date(),
        status,
        notes:             notes ?? null,
      },
    });

    // 2. Timeline: QC submitted
    await repo.addTimeline({
      productionOrderId:   id,
      timelineType:        "QC_SUBMITTED",
      description:         `QC result: ${status}${notes ? ` — ${notes}` : ""}`,
      createdByEmployeeId: qcEmployeeId ?? null,
    }, tx);

    if (status === "PASS") {
      // Auto-complete: masukkan finished goods ke inventory → ubah status COMPLETED
      await addFinishedGoods(order, qcEmployeeId, tx);
      await repo.update(id, { status: "COMPLETED", actualFinishAt: new Date() }, tx);
      await repo.addTimeline({
        productionOrderId:   id,
        timelineType:        "COMPLETED",
        description:         "Produksi selesai — QC PASS",
        createdByEmployeeId: qcEmployeeId ?? null,
      }, tx);

    } else if (status === "REWORK") {
      // Kembali ke IN_PROGRESS untuk rework
      await repo.update(id, { status: "IN_PROGRESS" }, tx);
      await repo.addTimeline({
        productionOrderId:   id,
        timelineType:        "STARTED",
        description:         "Dikembalikan ke IN_PROGRESS untuk rework",
        createdByEmployeeId: qcEmployeeId ?? null,
      }, tx);

    } else if (status === "REJECT") {
      // Kembali ke IN_PROGRESS — operator memutuskan: batalkan atau produksi ulang
      await repo.update(id, { status: "IN_PROGRESS" }, tx);
      await repo.addTimeline({
        productionOrderId:   id,
        timelineType:        "STARTED",
        description:         "QC REJECT — dikembalikan ke IN_PROGRESS. Batalkan atau produksi ulang.",
        createdByEmployeeId: qcEmployeeId ?? null,
      }, tx);
    }

    return { qcRecord: rec };
  });

  // Trigger Accurate sync setelah PASS (non-blocking, di luar transaksi)
  if (status === "PASS") {
    syncProductionToAccurate(id).catch((err) => {
      console.error(`[production] Auto-sync Accurate gagal untuk ${id}:`, err?.message ?? err);
    });
  }

  return { qcRecord, order: await getById(id) };
};

// ── remove ────────────────────────────────────────────────────────────────────
//
// Urutan:
//   1. Hapus dokumen di Accurate (RO → JC) jika sudah pernah di-sync — best effort
//   2. Reverse inventory movements (kembalikan stok material, kurangi stok barang jadi)
//   3. Hard delete production order dari DB (cascade items, materials, timelines, dst)
//
const remove = async (id) => {
  const order = await getById(id);

  // Ambil Accurate IDs via raw SQL (belum ada di Prisma client)
  const [syncRow] = await prisma.$queryRawUnsafe(
    `SELECT "accurate_pekerjaan_id"    AS "accuratePekerjaanId",
            "accurate_penyelesaian_id" AS "accuratePenyelesaianId"
     FROM   "production_orders" WHERE id = $1`,
    id,
  );

  // 1. Hapus dari Accurate (best-effort: jika gagal, log + lanjut delete DB)
  if (syncRow?.accuratePekerjaanId || syncRow?.accuratePenyelesaianId) {
    await deleteFromAccurate({
      accuratePekerjaanId:    syncRow.accuratePekerjaanId,
      accuratePenyelesaianId: syncRow.accuratePenyelesaianId,
    }).catch((err) => {
      console.error(`[production] Gagal hapus dari Accurate, lanjut hapus DB:`, err?.message ?? err);
    });
  }

  // 2. Reverse inventory + hapus order dalam satu transaksi
  await prisma.$transaction(async (tx) => {
    // Balik konsumsi material (qtyChange negatif → kembalikan ke stok)
    for (const mat of order.materials) {
      if (!mat.inventoryMovementId) continue;
      const mv = await tx.inventoryMovement.findUnique({
        where:  { id: mat.inventoryMovementId },
        select: { inventoryId: true, qtyChange: true },
      });
      if (!mv) continue;
      const reversal = D(mv.qtyChange).negated(); // OUT → balik jadi positif
      await tx.inventory.update({
        where: { id: mv.inventoryId },
        data:  { qtyOnHand: { increment: reversal }, qtyAvailable: { increment: reversal } },
      });
    }

    // Balik penambahan barang jadi (qtyChange positif → kurangi dari stok)
    for (const item of order.items) {
      if (!item.inventoryMovementId) continue;
      const mv = await tx.inventoryMovement.findUnique({
        where:  { id: item.inventoryMovementId },
        select: { inventoryId: true, qtyChange: true },
      });
      if (!mv) continue;
      const reversal = D(mv.qtyChange).negated(); // IN → balik jadi negatif
      await tx.inventory.update({
        where: { id: mv.inventoryId },
        data:  { qtyOnHand: { increment: reversal }, qtyAvailable: { increment: reversal } },
      });
    }

    // Hard delete — cascade: items, materials, employees, qcRecords, timelines
    await repo.remove(id, tx);
  });

  return { deleted: true, id };
};

// ── getStats ──────────────────────────────────────────────────────────────────
const getStats = async ({ branchId, startDate, endDate } = {}) => {
  const where = {};
  if (branchId) where.branchId = branchId;
  if (startDate || endDate) {
    where.productionDate = {};
    if (startDate) where.productionDate.gte = new Date(startDate);
    if (endDate)   where.productionDate.lte = new Date(endDate);
  }

  const [statusCounts, recentOrders] = await Promise.all([
    prisma.productionOrder.groupBy({
      by:    ["status"],
      where,
      _count: { id: true },
    }),
    prisma.productionOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    5,
      select:  {
        id: true, productionNo: true, status: true, productionDate: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  const counts = {};
  for (const row of statusCounts) counts[row.status] = row._count.id;

  return {
    total:      Object.values(counts).reduce((a, b) => a + b, 0),
    byStatus:   counts,
    recent:     recentOrders,
  };
};

module.exports = { getAll, getById, create, updateStatus, submitQC, remove, getStats };
