const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.branch.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
  });

const count = (where) => prisma.branch.count({ where });

const findById = (id) =>
  prisma.branch.findUnique({ where: { id } });

const findByCode = (code) =>
  prisma.branch.findUnique({ where: { code } });

const create = (data) => prisma.branch.create({ data });

const update = (id, data) =>
  prisma.branch.update({ where: { id }, data });

const softDelete = (id) =>
  prisma.branch.update({ where: { id }, data: { isActive: false } });

const hardDelete = (id) =>
  prisma.branch.delete({ where: { id } });

const countActiveEmployees = (branchId) =>
  prisma.employee.count({
    where: {
      isActive: true,
      OR: [
        { homeBranchId: branchId },
        { employeeBranches: { some: { branchId, isActive: true } } },
      ],
    },
  });

/**
 * Look up the Accurate branch ID for a local branch.
 * Throws 404 if the branch doesn't exist, 422 if not yet mapped to Accurate.
 * Used by all Accurate sync services that need to include branchId in payloads.
 */
const getAccurateBranchId = async (branchId) => {
  if (!branchId) throw new AppError("branchId is required for Accurate sync", StatusCodes.UNPROCESSABLE_ENTITY);

  const branch = await prisma.branch.findUnique({
    where:  { id: branchId },
    select: { accurateBranchId: true, name: true },
  });

  if (!branch) {
    throw new AppError(`Branch not found: ${branchId}`, StatusCodes.NOT_FOUND);
  }

  if (!branch.accurateBranchId) {
    throw new AppError(
      `Branch "${branch.name}" belum di-mapping ke Accurate. Jalankan POST /branches/sync-accurate terlebih dahulu.`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return branch.accurateBranchId;
};

const countAssignedWarehouses = (branchId) =>
  prisma.warehouse.count({ where: { branchId } });

module.exports = { findAll, count, findById, findByCode, create, update, softDelete, hardDelete, countActiveEmployees, countAssignedWarehouses, getAccurateBranchId };
