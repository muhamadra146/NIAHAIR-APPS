const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const prisma = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo = require("./serviceJobSlot.repository");

// ── List ──────────────────────────────────────────────────────────────

const listJobSlots = async (itemId, { all = false, page, limit } = {}) => {
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

const createJobSlot = async (itemId, body) => {
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);

  const {
    slotKey, label, commissionRate,
    commissionMode,
    roleId    = null,
    isMainJob = false,
    slotType,
    isRequired = false,
    sortOrder  = 0,
  } = body;

  const existing = await repo.findByItemAndSlotKey(itemId, slotKey);
  if (existing) {
    throw new AppError(
      `Slot key "${slotKey}" sudah ada untuk item ini`,
      StatusCodes.CONFLICT
    );
  }

  const data = {
    itemId, slotKey, label, commissionRate, isRequired, sortOrder,
    ...(commissionMode !== undefined && { commissionMode }),
    ...(roleId   !== undefined && { roleId }),
    ...(isMainJob !== undefined && { isMainJob }),
    ...(slotType  !== undefined && { slotType }),
  };

  return repo.create(data);
};

// ── Update ────────────────────────────────────────────────────────────

const updateJobSlot = async (itemId, id, body) => {
  const slot = await repo.findById(id);
  if (!slot || slot.itemId !== itemId) {
    throw new AppError("Job slot not found", StatusCodes.NOT_FOUND);
  }

  const {
    slotKey, label, commissionRate, commissionMode,
    roleId, isMainJob, slotType,
    isRequired, sortOrder, isActive,
  } = body;

  // Cek duplikasi slotKey jika diubah
  if (slotKey && slotKey !== slot.slotKey) {
    const existing = await repo.findByItemAndSlotKey(itemId, slotKey);
    if (existing) {
      throw new AppError(
        `Slot key "${slotKey}" sudah ada untuk item ini`,
        StatusCodes.CONFLICT
      );
    }
  }

  const data = {};
  if (slotKey        !== undefined) data.slotKey        = slotKey;
  if (label          !== undefined) data.label          = label;
  if (commissionRate !== undefined) data.commissionRate = commissionRate;
  if (commissionMode !== undefined) data.commissionMode = commissionMode;
  if (roleId         !== undefined) data.roleId         = roleId;
  if (isMainJob      !== undefined) data.isMainJob      = isMainJob;
  if (slotType       !== undefined) data.slotType       = slotType;
  if (isRequired     !== undefined) data.isRequired     = isRequired;
  if (sortOrder      !== undefined) data.sortOrder      = sortOrder;
  if (isActive       !== undefined) data.isActive       = isActive;

  return repo.update(id, data);
};

// ── Delete (hard — cek assignment dulu) ──────────────────────────────

const deleteJobSlot = async (itemId, id) => {
  const slot = await repo.findById(id);
  if (!slot || slot.itemId !== itemId) {
    throw new AppError("Job slot not found", StatusCodes.NOT_FOUND);
  }

  const assignmentCount = await repo.countAssignments(id);
  if (assignmentCount > 0) {
    throw new AppError(
      `Slot sudah digunakan dalam ${assignmentCount} assignment komisi dan tidak bisa dihapus.`,
      StatusCodes.CONFLICT
    );
  }

  return repo.hardDelete(id);
};

module.exports = { listJobSlots, createJobSlot, updateJobSlot, deleteJobSlot };
