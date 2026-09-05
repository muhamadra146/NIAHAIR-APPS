const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const prisma   = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo     = require("./serviceJobRole.repository");

// ── List ──────────────────────────────────────────────────────────────

const listJobRoles = async (itemId, { all = false, page, limit } = {}) => {
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);

  const includeInactive = all === "true" || all === true;
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    repo.findAllByItem(itemId, includeInactive, { skip, take }),
    repo.countByItem(itemId, includeInactive),
  ]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Create ────────────────────────────────────────────────────────────

const createJobRole = async (itemId, body) => {
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);

  const { roleName, commissionRate, sortOrder = 0 } = body;

  const existing = await repo.findByItemAndName(itemId, roleName);
  if (existing) {
    throw new AppError(
      `Role "${roleName}" sudah ada untuk item ini`,
      StatusCodes.CONFLICT
    );
  }

  // Buat role + auto-create slot UTAMA (MAIN) dalam satu transaksi.
  // Slot UTAMA diperlukan agar role muncul di dropdown Generate Komisi.
  // User tidak perlu tahu soal slot untuk kasus sederhana (satu orang per role).
  const slotKey = roleName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_");

  return prisma.$transaction(async (tx) => {
    const role = await tx.serviceJobRole.create({
      data: { itemId, roleName, commissionRate, sortOrder },
    });

    await tx.serviceJobSlot.create({
      data: {
        itemId,
        roleId:         role.id,
        slotKey,
        label:          roleName,            // default sama dengan nama role
        commissionRate: 0,                   // pool dari role.commissionRate, bukan slot
        commissionMode: "FIXED_RATE",        // default: tidak perlu input helaian
        slotType:       "PERCENTAGE",
        isMainJob:      true,                // slot UTAMA → muncul di Generate Komisi
        isRequired:     false,
        sortOrder:      0,
      },
    });

    // Return role dengan slots (sama seperti findAllByItem)
    return tx.serviceJobRole.findUnique({
      where:   { id: role.id },
      include: { slots: { where: { isActive: true } } },
    });
  });
};

// ── Update ────────────────────────────────────────────────────────────

const updateJobRole = async (itemId, id, body) => {
  const role = await repo.findById(id);
  if (!role || role.itemId !== itemId) {
    throw new AppError("Job role not found", StatusCodes.NOT_FOUND);
  }

  const { roleName, commissionRate, sortOrder, isActive } = body;

  // Cek duplicate roleName jika diubah
  if (roleName && roleName !== role.roleName) {
    const existing = await repo.findByItemAndName(itemId, roleName);
    if (existing) {
      throw new AppError(
        `Role "${roleName}" sudah ada untuk item ini`,
        StatusCodes.CONFLICT
      );
    }
  }

  const data = {};
  if (roleName        !== undefined) data.roleName        = roleName;
  if (commissionRate  !== undefined) data.commissionRate  = commissionRate;
  if (sortOrder       !== undefined) data.sortOrder       = sortOrder;
  if (isActive        !== undefined) data.isActive        = isActive;

  return repo.update(id, data);
};

// ── Delete (hard — hapus slot terlebih dahulu, cek assignment) ────────

const deleteJobRole = async (itemId, id) => {
  const role = await repo.findById(id);
  if (!role || role.itemId !== itemId) {
    throw new AppError("Job role not found", StatusCodes.NOT_FOUND);
  }

  // Cek apakah ada slot yang sudah dipakai dalam assignment
  const assignmentCount = await repo.countSlotAssignments(id);
  if (assignmentCount > 0) {
    throw new AppError(
      `Role ini sudah digunakan dalam ${assignmentCount} assignment komisi dan tidak bisa dihapus.`,
      StatusCodes.CONFLICT
    );
  }

  // Hapus semua slot dulu, baru hapus role (dalam transaksi)
  return prisma.$transaction(async (tx) => {
    await repo.deleteSlotsByRole(id, tx);
    return repo.hardDelete(id);
  });
};

module.exports = { listJobRoles, createJobRole, updateJobRole, deleteJobRole };
