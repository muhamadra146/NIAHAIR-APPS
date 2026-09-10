const prisma = require("../../config/prisma");

const INCLUDE = {
  glAccount: {
    select: { id: true, number: true, name: true, category: true },
  },
};

const findAll = () =>
  prisma.payrollGlAccount.findMany({
    orderBy: [{ type: "asc" }, { category: "asc" }],
    include: INCLUDE,
  });

const findByCategory = (category) =>
  prisma.payrollGlAccount.findUnique({ where: { category }, include: INCLUDE });

/**
 * Upsert a single mapping. Creates the row if missing (by category),
 * updates glAccountId otherwise.
 */
const upsert = (category, label, type, glAccountId) =>
  prisma.payrollGlAccount.upsert({
    where:  { category },
    create: { category, label, type, glAccountId: glAccountId ?? null },
    update: { glAccountId: glAccountId ?? null },
    include: INCLUDE,
  });

/**
 * Bulk upsert — used by service to save all mappings at once.
 * items: Array<{ category, label, type, glAccountId }>
 */
const upsertMany = (items) =>
  prisma.$transaction(
    items.map(({ category, label, type, glAccountId }) =>
      prisma.payrollGlAccount.upsert({
        where:  { category },
        create: { category, label, type, glAccountId: glAccountId ?? null },
        update: { glAccountId: glAccountId ?? null },
      })
    )
  );

module.exports = { findAll, findByCategory, upsert, upsertMany };
