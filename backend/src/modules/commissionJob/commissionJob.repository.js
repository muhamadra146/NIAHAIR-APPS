const prisma = require("../../config/prisma");

const findAllByCategory = (categoryId, includeInactive = false) =>
  prisma.commissionJob.findMany({
    where: {
      commissionCategoryId: categoryId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      // Sertakan info job yang menjadi target potongan (untuk display di UI)
      deductsFrom: { select: { id: true, name: true } },
    },
  });

const findById = (id) =>
  prisma.commissionJob.findUnique({ where: { id } });

const findByKey = (categoryId, jobKey) =>
  prisma.commissionJob.findUnique({
    where: { commissionCategoryId_jobKey: { commissionCategoryId: categoryId, jobKey } },
  });

const create = (data) =>
  prisma.commissionJob.create({ data });

const update = (id, data) =>
  prisma.commissionJob.update({ where: { id }, data });

const hardDelete = (id) =>
  prisma.commissionJob.delete({ where: { id } });

const countRules = (id) =>
  prisma.commissionRule.count({ where: { commissionJobId: id } });

const countAssignments = (id) =>
  prisma.treatmentJobAssignment.count({ where: { commissionJobId: id } });

module.exports = {
  findAllByCategory,
  findById,
  findByKey,
  create,
  update,
  hardDelete,
  countRules,
  countAssignments,
};
