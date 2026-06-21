const prisma = require("../../config/prisma");

const findAll = ({ page = 1, limit = 20, search } = {}) => {
  const where = search ? { name: { contains: search, mode: "insensitive" } } : {};
  return prisma.itemCategory.findMany({
    where,
    skip: (Number(page) - 1) * Number(limit),
    take:  Number(limit),
    orderBy: { name: "asc" },
  });
};

const count = (search) => {
  const where = search ? { name: { contains: search, mode: "insensitive" } } : {};
  return prisma.itemCategory.count({ where });
};

const findByAccurateId = (accurateCategoryId) =>
  prisma.itemCategory.findUnique({
    where:  { accurateCategoryId },
    select: { id: true },
  });

const upsertFromAccurate = (accurateCategoryId, name) =>
  prisma.itemCategory.upsert({
    where:  { accurateCategoryId },
    create: { accurateCategoryId, name, isActive: true },
    update: { name, isActive: true },
    select: { id: true },
  });

module.exports = { findAll, count, findByAccurateId, upsertFromAccurate };
