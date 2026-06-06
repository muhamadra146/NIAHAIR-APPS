const prisma = require("../../config/prisma");

const INCLUDE = {
  branch: { select: { id: true, code: true, name: true } },
};

// ── Read ──────────────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.warehouse.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.warehouse.count({ where });

const findById = (id) =>
  prisma.warehouse.findUnique({ where: { id }, include: INCLUDE });

// findFirst because branchId is nullable; findUnique with null scalar can be surprising
const findByBranchId = (branchId) =>
  prisma.warehouse.findFirst({
    where:   { branchId, isActive: true },
    include: INCLUDE,
  });

const findByAccurateId = (accurateWarehouseId) =>
  prisma.warehouse.findUnique({
    where:  { accurateWarehouseId },
    select: { id: true },
  });

// ── Lookup helpers ────────────────────────────────────────────────────

const findBranchById = (id) =>
  prisma.branch.findUnique({ where: { id }, select: { id: true } });

// ── Write ─────────────────────────────────────────────────────────────

// Accurate-owned fields only; branchId is NOT set here (admin maps separately)
const upsertFromAccurate = ({ accurateWarehouseId, name, isActive }) =>
  prisma.warehouse.upsert({
    where:  { accurateWarehouseId },
    create: { accurateWarehouseId, name, isActive, lastSyncAt: new Date() },
    update: { name, isActive, lastSyncAt: new Date() },
    include: INCLUDE,
  });

const updateBranchMapping = (id, branchId) =>
  prisma.warehouse.update({
    where: { id },
    data:  { branchId },
    include: INCLUDE,
  });

const updateAccurateMapping = (id, accurateWarehouseId) =>
  prisma.warehouse.update({
    where: { id },
    data:  { accurateWarehouseId, lastSyncAt: new Date() },
    include: INCLUDE,
  });

module.exports = {
  findAll, count, findById, findByBranchId,
  findByAccurateId, findBranchById,
  upsertFromAccurate, updateBranchMapping, updateAccurateMapping,
};
