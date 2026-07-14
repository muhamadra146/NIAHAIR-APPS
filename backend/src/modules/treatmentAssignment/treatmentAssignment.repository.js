const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: {
    select: { id: true, name: true, employeeCode: true },
  },
  treatmentItem: {
    select: {
      id:                 true,
      qty:                true,
      priceSnapshot:      true,
      conversionSnapshot: true,
      item: { select: { id: true, name: true, itemCode: true, itemType: true } },
      unit: { select: { id: true, name: true } },
    },
  },
};


// ── TreatmentAssignment ───────────────────────────────────────────────

const findByItem = (treatmentItemId) =>
  prisma.treatmentAssignment.findMany({
    where:   { treatmentItemId },
    orderBy: { createdAt: "asc" },
    include: INCLUDE,
  });

const findById = (id) =>
  prisma.treatmentAssignment.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.treatmentAssignment.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.treatmentAssignment.update({ where: { id }, data, include: INCLUDE });

const deleteById = (id) =>
  prisma.treatmentAssignment.delete({ where: { id } });

// Sum of all workQty already assigned for a treatment item.
// Pass excludeId to exclude a specific assignment (used when updating).
const sumWorkQtyByItem = async (treatmentItemId, excludeId = null) => {
  const where = { treatmentItemId };
  if (excludeId) where.id = { not: excludeId };

  const result = await prisma.treatmentAssignment.aggregate({
    where,
    _sum: { workQty: true },
  });

  return Number(result._sum.workQty ?? 0);
};

// Sum of workQty per slotKey — digunakan untuk validasi per-role (stylist/asisten independen).
const sumWorkQtyBySlot = async (treatmentItemId, slotKey, excludeId = null) => {
  const where = { treatmentItemId, slotKey };
  if (excludeId) where.id = { not: excludeId };

  const result = await prisma.treatmentAssignment.aggregate({
    where,
    _sum: { workQty: true },
  });

  return Number(result._sum.workQty ?? 0);
};

// ── Lookups for validation ────────────────────────────────────────────

const findTreatmentItemById = (id) =>
  prisma.treatmentItem.findUnique({
    where:  { id },
    select: {
      id:                 true,
      qty:                true,
      priceSnapshot:      true,
      conversionSnapshot: true,
      item: { select: { itemType: true } },
    },
  });

const countByItem = (treatmentItemId) =>
  prisma.treatmentAssignment.count({ where: { treatmentItemId } });

const updateManyWorkQty = (treatmentItemId, workQty) =>
  prisma.treatmentAssignment.updateMany({
    where: { treatmentItemId },
    data:  { workQty },
  });

const findEmployeeById = (id) =>
  prisma.employee.findUnique({
    where:  { id },
    select: { id: true, isActive: true },
  });

module.exports = {
  findByItem,
  findById,
  create,
  update,
  deleteById,
  sumWorkQtyByItem,
  sumWorkQtyBySlot,
  findTreatmentItemById,
  findEmployeeById,
  countByItem,
  updateManyWorkQty,
};
