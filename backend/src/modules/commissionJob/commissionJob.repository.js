const prisma = require("../../config/prisma");

// Tingkatan tarif: batas staf naik, "lebih dari itu" (null) terakhir
const RATE_TIERS_INCLUDE = {
  select:  { id: true, maxStaff: true, value: true },
  orderBy: { maxStaff: { sort: "asc", nulls: "last" } },
};

const findAllByCategory = (categoryId, includeInactive = false, { skip = 0, take = 10 } = {}) =>
  prisma.commissionJob.findMany({
    where: {
      commissionCategoryId: categoryId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      // Sertakan info job yang menjadi target potongan (untuk display di UI)
      deductsFrom: { select: { id: true, name: true } },
      rateTiers:   RATE_TIERS_INCLUDE,
    },
    skip,
    take,
  });

const countByCategory = (categoryId, includeInactive = false) =>
  prisma.commissionJob.count({
    where: {
      commissionCategoryId: categoryId,
      ...(includeInactive ? {} : { isActive: true }),
    },
  });

const findById = (id) =>
  prisma.commissionJob.findUnique({ where: { id } });

const findByKey = (categoryId, jobKey) =>
  prisma.commissionJob.findUnique({
    where: { commissionCategoryId_jobKey: { commissionCategoryId: categoryId, jobKey } },
  });

// rateTiers: undefined = tidak diubah; [] = hapus semua; [...] = ganti semua
const create = (data, rateTiers) =>
  prisma.commissionJob.create({
    data: { ...data, ...(rateTiers?.length && { rateTiers: { create: rateTiers } }) },
    include: { rateTiers: RATE_TIERS_INCLUDE },
  });

const update = (id, data, rateTiers) =>
  prisma.commissionJob.update({
    where: { id },
    data:  { ...data, ...(rateTiers !== undefined && { rateTiers: { deleteMany: {}, create: rateTiers } }) },
    include: { rateTiers: RATE_TIERS_INCLUDE },
  });

const hardDelete = (id) =>
  prisma.commissionJob.delete({ where: { id } });

const countRules = (id) =>
  prisma.commissionRule.count({ where: { commissionJobId: id } });

const countAssignments = (id) =>
  prisma.treatmentJobAssignment.count({ where: { commissionJobId: id } });

module.exports = {
  findAllByCategory,
  countByCategory,
  findById,
  findByKey,
  create,
  update,
  hardDelete,
  countRules,
  countAssignments,
};
