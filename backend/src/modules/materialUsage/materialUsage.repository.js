const prisma = require("../../config/prisma");

const findBySession = (sessionId) =>
  prisma.materialUsageItem.findMany({
    where: {
      materialUsage: {
        treatmentItem: { treatmentSessionId: sessionId },
      },
    },
    include: {
      materialItem: {
        select: {
          id: true, name: true, itemCode: true, itemType: true,
          category:    { select: { id: true, name: true } },
          defaultUnit: { select: { id: true, name: true } },
          itemUnits:   { select: { unitId: true, conversionFactor: true } },
        },
      },
      unit: { select: { id: true, name: true } },
      materialUsage: {
        select: {
          id: true,
          treatmentItemId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

const findOrCreateUsage = async (treatmentItemId) => {
  const existing = await prisma.materialUsage.findFirst({
    where: { treatmentItemId },
  });
  if (existing) return existing;
  return prisma.materialUsage.create({
    data: { treatmentItemId, processedAt: new Date() },
  });
};

const findUsageItemById = (id) =>
  prisma.materialUsageItem.findUnique({
    where: { id },
    include: {
      materialUsage: {
        select: {
          id:             true,
          treatmentItemId: true,
          treatmentItem:  { select: { treatmentSessionId: true } },
        },
      },
    },
  });

const createUsageItem = (data) =>
  prisma.materialUsageItem.create({ data });

const updateUsageItemQty = (id, qty) =>
  prisma.materialUsageItem.update({ where: { id }, data: { qty } });

const deleteUsageItem = (id) =>
  prisma.materialUsageItem.delete({ where: { id } });

const findTreatmentItem = (id) =>
  prisma.treatmentItem.findUnique({ where: { id }, select: { id: true } });

const findSessionById = (id) =>
  prisma.treatmentSession.findUnique({ where: { id }, select: { id: true, completedAt: true, invoiceId: true } });

module.exports = {
  findBySession,
  findOrCreateUsage,
  findUsageItemById,
  createUsageItem,
  updateUsageItemQty,
  deleteUsageItem,
  findTreatmentItem,
  findSessionById,
};
