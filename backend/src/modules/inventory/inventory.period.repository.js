const prisma = require("../../config/prisma");

const findPeriod = (year, month) =>
  prisma.inventoryPeriod.findUnique({ where: { year_month: { year, month } } });

const upsertOpenPeriod = (year, month) =>
  prisma.inventoryPeriod.upsert({
    where:  { year_month: { year, month } },
    create: { year, month, status: "OPEN" },
    update: {},
  });

// Close period: set status + closedAt + closedByEmployeeId, lock all movements in that month
const closePeriod = async (year, month, closedByEmployeeId) => {
  const now = new Date();

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startOfNext  = new Date(Date.UTC(year, month, 1));

  return prisma.$transaction(async (tx) => {
    const period = await tx.inventoryPeriod.upsert({
      where:  { year_month: { year, month } },
      create: {
        year, month,
        status:             "CLOSED",
        closedAt:           now,
        closedByEmployeeId: closedByEmployeeId ?? null,
      },
      update: {
        status:             "CLOSED",
        closedAt:           now,
        closedByEmployeeId: closedByEmployeeId ?? null,
      },
    });

    await tx.inventoryMovement.updateMany({
      where: {
        createdAt: { gte: startOfMonth, lt: startOfNext },
        isLocked:  false,
      },
      data: { isLocked: true },
    });

    return period;
  });
};

// Reopen period: set status back to OPEN, unlock all movements in that month
const reopenPeriod = async (year, month) => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startOfNext  = new Date(Date.UTC(year, month, 1));

  return prisma.$transaction(async (tx) => {
    const period = await tx.inventoryPeriod.upsert({
      where:  { year_month: { year, month } },
      create: { year, month, status: "OPEN" },
      update: {
        status:             "OPEN",
        closedAt:           null,
        closedByEmployeeId: null,
      },
    });

    await tx.inventoryMovement.updateMany({
      where: {
        createdAt: { gte: startOfMonth, lt: startOfNext },
        isLocked:  true,
      },
      data: { isLocked: false },
    });

    return period;
  });
};

module.exports = { findPeriod, upsertOpenPeriod, closePeriod, reopenPeriod };
