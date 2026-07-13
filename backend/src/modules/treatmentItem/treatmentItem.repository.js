const prisma = require("../../config/prisma");

const INCLUDE = {
  item: { select: { id: true, name: true, itemCode: true, itemType: true, defaultUnit: { select: { id: true, name: true } } } },
  unit: { select: { id: true, name: true } },
  assignments: {
    include: { employee: { select: { id: true, name: true, employeeCode: true } } },
    orderBy: { createdAt: "asc" },
  },
  _count: { select: { assignments: true } },
};

// ── TreatmentItem ─────────────────────────────────────────────────────

const findBySession = (treatmentSessionId) =>
  prisma.treatmentItem.findMany({
    where:   { treatmentSessionId },
    orderBy: { createdAt: "asc" },
    include: INCLUDE,
  });

const findById = (id) =>
  prisma.treatmentItem.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.treatmentItem.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.treatmentItem.update({ where: { id }, data, include: INCLUDE });

const deleteById = (id) =>
  prisma.treatmentItem.delete({ where: { id } });

// ── Lookups for create validation ─────────────────────────────────────

const findSessionById = (id) =>
  prisma.treatmentSession.findUnique({ where: { id }, select: { id: true } });

const findItemById = (id) =>
  prisma.item.findUnique({ where: { id }, select: { id: true, name: true } });

// Compound unique on ItemUnit — validates the unit belongs to the item
// and returns conversionFactor for the snapshot.
const findItemUnit = (itemId, unitId) =>
  prisma.itemUnit.findUnique({
    where:  { itemId_unitId: { itemId, unitId } },
    select: { conversionFactor: true },
  });

// Global active price (branchId = null) — source of priceSnapshot.
const findActiveItemPrice = (itemId, unitId) =>
  prisma.itemPrice.findFirst({
    where:  { itemId, unitId, isActive: true, branchId: null },
    select: { sellingPrice: true },
  });

module.exports = {
  findBySession,
  findById,
  create,
  update,
  deleteById,
  findSessionById,
  findItemById,
  findItemUnit,
  findActiveItemPrice,
};
