const prisma = require("../../config/prisma");

const PARENT_SELECT = { select: { id: true, name: true } };

const findAll = ({ page = 1, limit = 200, search } = {}) => {
  const where = search ? { name: { contains: search, mode: "insensitive" } } : {};
  return prisma.itemCategory.findMany({
    where,
    skip:    (Number(page) - 1) * Number(limit),
    take:    Number(limit),
    orderBy: { name: "asc" },
    include: { parent: PARENT_SELECT },
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

const upsertFromAccurate = (accurateCategoryId, name, parentId) =>
  prisma.itemCategory.upsert({
    where:  { accurateCategoryId },
    create: { accurateCategoryId, name, isActive: true, parentId: parentId ?? null },
    update: { name, isActive: true },
    select: { id: true },
  });

const setParent = (childAccurateId, parentLocalId) =>
  prisma.itemCategory.update({
    where:  { accurateCategoryId: childAccurateId },
    data:   { parentId: parentLocalId },
    select: { id: true },
  });

const findByAccurateIdWithId = (accurateCategoryId) =>
  prisma.itemCategory.findUnique({
    where:  { accurateCategoryId },
    select: { id: true, name: true, parentId: true },
  });

module.exports = { findAll, count, findByAccurateId, upsertFromAccurate, setParent, findByAccurateIdWithId };
