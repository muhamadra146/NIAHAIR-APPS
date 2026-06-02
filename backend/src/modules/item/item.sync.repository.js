const prisma = require("../../config/prisma");

// ── Item ──────────────────────────────────────────────────────────────

// Match ONLY on accurateItemId — never on name, code, or type.
const findByAccurateId = (accurateId) =>
  prisma.item.findUnique({
    where: { accurateItemId: accurateId },
    select: { id: true },
  });

const createFromAccurate = (data) => prisma.item.create({ data });

const updateByAccurateId = (accurateItemId, data) =>
  prisma.item.update({ where: { accurateItemId }, data });

// ── Unit ──────────────────────────────────────────────────────────────

// Match ONLY on accurateUnitId — used to avoid creating duplicate units.
const findUnitByAccurateId = (accurateUnitId) =>
  prisma.unit.findUnique({
    where: { accurateUnitId },
    select: { id: true },
  });

// Auto-create a unit from Accurate payload when it does not exist locally.
const createUnit = (data) => prisma.unit.create({ data, select: { id: true } });

// ── ItemUnit ──────────────────────────────────────────────────────────

// Upsert by compound unique (itemId + unitId).
// Updates conversionFactor and isDefault on re-sync without duplicating rows.
const upsertItemUnit = (itemId, unitId, conversionFactor, isDefault) =>
  prisma.itemUnit.upsert({
    where:  { itemId_unitId: { itemId, unitId } },
    create: { itemId, unitId, conversionFactor, isDefault },
    update: { conversionFactor, isDefault },
  });

// ── ItemPrice ─────────────────────────────────────────────────────────

// Find the single active global price (branchId = null) for an item + unit.
// The partial unique index enforces at most one such row.
const findActiveGlobalPrice = (itemId, unitId) =>
  prisma.itemPrice.findFirst({
    where:  { itemId, unitId, branchId: null, isActive: true },
    select: { id: true, sellingPrice: true, costPrice: true },
  });

const deactivatePriceById = (id) =>
  prisma.itemPrice.update({ where: { id }, data: { isActive: false } });

const createItemPrice = (data) => prisma.itemPrice.create({ data });

module.exports = {
  findByAccurateId,
  createFromAccurate,
  updateByAccurateId,
  findUnitByAccurateId,
  createUnit,
  upsertItemUnit,
  findActiveGlobalPrice,
  deactivatePriceById,
  createItemPrice,
};
