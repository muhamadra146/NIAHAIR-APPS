const prisma = require("../../config/prisma");

const findById = (id) =>
  prisma.glAccount.findUnique({ where: { id } });

const findByAccurateId = (accurateGlAccountId) =>
  prisma.glAccount.findUnique({ where: { accurateGlAccountId } });

const createFromAccurate = (data) =>
  prisma.glAccount.create({
    data: { ...data, lastSyncAt: new Date() },
  });

const updateByAccurateId = (accurateGlAccountId, data) =>
  prisma.glAccount.update({
    where: { accurateGlAccountId },
    data:  { ...data, lastSyncAt: new Date() },
  });

const findAllActive = ({ category, usage } = {}) => {
  const where = { isActive: true };
  if (category) {
    const categories = category.split(",").map((c) => c.trim()).filter(Boolean);
    if (categories.length > 0) where.category = { in: categories };
  }
  if (usage) where.usage = usage;
  return prisma.glAccount.findMany({
    where,
    select:  { id: true, number: true, name: true, category: true, usage: true },
    orderBy: { number: "asc" },
  });
};

const findByCategory = (category) =>
  prisma.glAccount.findMany({
    where:   { isActive: true, category },
    select:  { accurateGlAccountId: true, number: true, name: true },
    orderBy: { number: "asc" },
  });

const findByUsage = (usage) =>
  prisma.glAccount.findMany({
    where:   { isActive: true, usage },
    select:  { accurateGlAccountId: true, number: true, name: true },
    orderBy: { number: "asc" },
  });

const updateUsage = (id, usage) =>
  prisma.glAccount.update({
    where: { id },
    data:  { usage: usage ?? null },
    select: { id: true, number: true, name: true, category: true, usage: true },
  });

module.exports = { findById, findByAccurateId, createFromAccurate, updateByAccurateId, findAllActive, findByCategory, findByUsage, updateUsage };
