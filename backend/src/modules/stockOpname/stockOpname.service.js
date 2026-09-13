const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo            = require("./stockOpname.repository");
const { validatePeriodOpen } = require("../inventory/inventory.period.service");
const { syncOpnameToAccurate } = require("./stockOpname.sync.service");

const D = (v) => new Prisma.Decimal(String(v));

// ── Nomor opname: OPN-YYYYMMDD-0001 ──────────────────────────────────────────
const buildOpnameNo = async (tx) => {
  const today  = new Date(Date.now() + 7 * 3600 * 1000); // WIB
  const yyyy   = today.getUTCFullYear();
  const mm     = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd     = String(today.getUTCDate()).padStart(2, "0");
  const prefix = `OPN-${yyyy}${mm}${dd}-`;
  const seq    = await repo.findMaxSeqToday(prefix, tx);
  return `${prefix}${String(seq + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────────────
const getAll = async ({ page = 1, limit = 20, warehouseId, status } = {}) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (status)      where.status      = status;

  const [rows, total] = await Promise.all([
    repo.findAll({ skip, take, where }),
    repo.count(where),
  ]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

// ── Single ────────────────────────────────────────────────────────────────────
const getById = async (id) => {
  const opname = await repo.findById(id);
  if (!opname) throw new AppError("Opname tidak ditemukan", StatusCodes.NOT_FOUND);
  return opname;
};

// ── Create — snapshot semua inventory INVENTORY-type di warehouse ─────────────
//
// Semua item jenis INVENTORY yang aktif di warehouse akan dimasukkan sebagai
// StockOpnameItem dengan qtySystem = qtyOnHand saat ini.
// Status dimulai DRAFT.
const create = async ({ warehouseId, notes, createdByEmployeeId }) => {
  await validatePeriodOpen(new Date());

  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) throw new AppError("Gudang tidak ditemukan", StatusCodes.NOT_FOUND);

  // Cek apakah ada opname aktif (DRAFT / IN_PROGRESS) untuk warehouse ini
  const activeOpname = await prisma.stockOpname.findFirst({
    where: { warehouseId, status: { in: ["DRAFT", "IN_PROGRESS"] } },
    select: { id: true, opnameNo: true },
  });
  if (activeOpname) {
    throw new AppError(
      `Masih ada opname aktif: ${activeOpname.opnameNo}. Selesaikan atau batalkan terlebih dahulu.`,
      StatusCodes.CONFLICT
    );
  }

  // Ambil semua inventory INVENTORY-type aktif
  const inventories = await prisma.inventory.findMany({
    where: {
      warehouseId,
      item: { isActive: true, itemType: "INVENTORY" },
    },
    select: { id: true, qtyOnHand: true },
  });

  if (inventories.length === 0) {
    throw new AppError(
      "Tidak ada item bertipe INVENTORY di gudang ini. Pastikan item sudah terdaftar.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return prisma.$transaction(async (tx) => {
    const opnameNo = await buildOpnameNo(tx);

    const opname = await tx.stockOpname.create({
      data: {
        opnameNo,
        warehouseId,
        status:             "DRAFT",
        notes:              notes ?? null,
        createdByEmployeeId: createdByEmployeeId ?? null,
        items: {
          create: inventories.map((inv) => ({
            inventoryId:  inv.id,
            qtySystem:    inv.qtyOnHand,
            qtyActual:    null,
            qtyDifference: null,
          })),
        },
      },
      select: { id: true, opnameNo: true },
    });

    return opname;
  });
};

// ── Update qtyActual (bulk per StockOpnameItem) ───────────────────────────────
//
// items: Array<{ id: StockOpnameItemId, qtyActual: number|null, notes?: string }>
// qtyActual null = belum diisi (reset). Nilai 0 valid (stok habis).
const updateItems = async (opnameId, items) => {
  const opname = await repo.findById(opnameId);
  if (!opname) throw new AppError("Opname tidak ditemukan", StatusCodes.NOT_FOUND);
  if (opname.status === "POSTED") {
    throw new AppError("Opname sudah diposting, tidak bisa diubah", StatusCodes.CONFLICT);
  }
  if (opname.status === "CANCELLED") {
    throw new AppError("Opname sudah dibatalkan", StatusCodes.CONFLICT);
  }

  // Validasi: semua id harus milik opname ini
  const validIds = new Set(opname.items.map((i) => i.id));
  const invalidIds = items.filter((i) => !validIds.has(i.id)).map((i) => i.id);
  if (invalidIds.length > 0) {
    throw new AppError(
      `Item tidak ditemukan dalam opname ini: ${invalidIds.join(", ")}`,
      StatusCodes.BAD_REQUEST
    );
  }

  await prisma.$transaction(
    items.map(({ id, qtyActual, notes }) =>
      prisma.stockOpnameItem.update({
        where: { id },
        data: {
          qtyActual: qtyActual !== undefined && qtyActual !== null
            ? D(String(qtyActual))
            : null,
          notes: notes !== undefined ? (notes ?? null) : undefined,
        },
      })
    )
  );

  // Upgrade ke IN_PROGRESS jika masih DRAFT
  if (opname.status === "DRAFT") {
    await prisma.stockOpname.update({
      where: { id: opnameId },
      data:  { status: "IN_PROGRESS" },
    });
  }

  return repo.findById(opnameId);
};

// ── Post — buat ADJUSTMENT movement untuk setiap item yang ada selisih ────────
//
// Item yang qtyActual null dianggap sama dengan qtySystem (tidak ada selisih).
// Hanya item yang berbeda dari qtySystem yang menghasilkan movement.
// qtyChange = selisih vs snapshot (bukan vs balance terkini) supaya mutasi sah
// yang terjadi SELAMA opname berlangsung tidak ikut terhapus.
// Contoh: snapshot=100, masuk pembelian 20 (sehingga qtyOnHand=120), hitung fisik=95
//   → selisih = 95-100 = -5; qtyAfter = 120+(-5) = 115  ← BENAR
//   (bukan: qtyAfter = qtyActual = 95; karena itu menghapus 20 unit pembelian sah)
const post = async (opnameId, postedByEmployeeId) => {
  await validatePeriodOpen(new Date());

  const opname = await repo.findById(opnameId);
  if (!opname) throw new AppError("Opname tidak ditemukan", StatusCodes.NOT_FOUND);
  if (opname.status === "POSTED") {
    throw new AppError("Opname sudah diposting", StatusCodes.CONFLICT);
  }
  if (opname.status === "CANCELLED") {
    throw new AppError("Opname sudah dibatalkan", StatusCodes.CONFLICT);
  }

  return prisma.$transaction(async (tx) => {
    let adjustedCount = 0; // hanya item yang benar-benar ada selisih

    for (const item of opname.items) {
      // qtyActual null → anggap sama dengan system (tidak ada koreksi)
      const qtyActual = item.qtyActual !== null
        ? D(String(item.qtyActual))
        : D(String(item.qtySystem));

      // Selisih vs snapshot saat opname dibuat (bukan vs balance terkini)
      const qtyDifference = qtyActual.sub(D(String(item.qtySystem)));

      // Jika tidak ada selisih: catat qtyActual & qtyDifference tanpa movement
      if (qtyDifference.equals(D("0"))) {
        await tx.stockOpnameItem.update({
          where: { id: item.id },
          data:  { qtyActual, qtyDifference: D("0") },
        });
        continue; // lewati pembuatan movement dan perubahan inventory
      }

      // Ada selisih → ambil balance terkini, lalu terapkan delta
      const inv = await tx.inventory.findUnique({
        where:  { id: item.inventoryId },
        select: { qtyOnHand: true, qtyReserved: true },
      });
      if (!inv) continue;

      const qtyBefore    = D(String(inv.qtyOnHand));
      const qtyChange    = qtyDifference;               // delta vs snapshot
      const qtyAfter     = qtyBefore.add(qtyChange);    // terapkan delta ke balance terkini
      const newAvailable = qtyAfter.sub(D(String(inv.qtyReserved)));

      // Buat movement hanya untuk item yang ada selisih
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId:         item.inventoryId,
          movementType:        "ADJUSTMENT",
          sourceModule:        "OPNAME",
          createdSource:       "USER",
          warehouseId:         opname.warehouseId,
          qtyBefore,
          qtyChange,
          qtyAfter,
          referenceType:       "STOCK_OPNAME",
          referenceId:         opnameId,
          referenceNo:         opname.opnameNo,
          reason:              "stock_opname",
          notes:               `Opname ${opname.opnameNo}: ${item.inventory.item.name}`,
          createdByEmployeeId: postedByEmployeeId ?? null,
        },
        select: { id: true },
      });

      // Update inventory balance
      await tx.inventory.update({
        where: { id: item.inventoryId },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
      });

      // Link stockOpnameItem → movement + catat selisih
      await tx.stockOpnameItem.update({
        where: { id: item.id },
        data: {
          qtyActual,
          qtyDifference,
          inventoryMovementId: movement.id,
        },
      });

      adjustedCount++;
    }

    // Tandai opname sebagai POSTED
    await tx.stockOpname.update({
      where: { id: opnameId },
      data: {
        status:             "POSTED",
        postedByEmployeeId: postedByEmployeeId ?? null,
        postedAt:           new Date(),
      },
    });

    return { adjustedCount, opnameNo: opname.opnameNo };
  });
};

// ── Cancel ────────────────────────────────────────────────────────────────────
const cancel = async (opnameId) => {
  const opname = await repo.findById(opnameId);
  if (!opname) throw new AppError("Opname tidak ditemukan", StatusCodes.NOT_FOUND);
  if (opname.status === "POSTED") {
    throw new AppError("Opname yang sudah diposting tidak bisa dibatalkan", StatusCodes.CONFLICT);
  }
  if (opname.status === "CANCELLED") {
    throw new AppError("Opname sudah dibatalkan", StatusCodes.CONFLICT);
  }

  await prisma.stockOpname.update({
    where: { id: opnameId },
    data:  { status: "CANCELLED" },
  });

  return { cancelled: true };
};

// ── Delete — hanya opname CANCELLED yang boleh dihapus ───────────────────────
const deleteOpname = async (id) => {
  const opname = await repo.findById(id);
  if (!opname) throw new AppError("Opname tidak ditemukan", StatusCodes.NOT_FOUND);
  if (opname.status !== "CANCELLED") {
    throw new AppError(
      "Hanya opname berstatus Dibatalkan yang dapat dihapus",
      StatusCodes.CONFLICT
    );
  }
  await prisma.$transaction([
    prisma.stockOpnameItem.deleteMany({ where: { stockOpnameId: id } }),
    prisma.stockOpname.delete({ where: { id } }),
  ]);
  return { deleted: true, opnameNo: opname.opnameNo };
};

// ── Sync ke Accurate — 2 dokumen (Perintah → Hasil) ──────────────────────────
const syncToAccurate = async (id) => {
  const opname = await repo.findById(id);
  if (!opname) throw new AppError("Opname tidak ditemukan", StatusCodes.NOT_FOUND);

  if (opname.status !== "POSTED") {
    throw new AppError(
      "Hanya opname berstatus POSTED yang bisa disinkronkan ke Accurate",
      StatusCodes.CONFLICT
    );
  }

  await syncOpnameToAccurate(id);
  return repo.findById(id); // kembalikan data terkini termasuk ID Accurate
};

module.exports = { getAll, getById, create, updateItems, post, cancel, deleteOpname, syncToAccurate };
