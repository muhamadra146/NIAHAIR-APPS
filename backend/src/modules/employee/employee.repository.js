const prisma = require("../../config/prisma");

const INCLUDE = {
  role: { select: { id: true, code: true, name: true } },
  employeeBranches: {
    where:   { isActive: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { branch: { select: { id: true, code: true, name: true } } },
  },
};

const findAll = ({ skip, take, where }) =>
  prisma.employee.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.employee.count({ where });

const findById = (id) =>
  prisma.employee.findUnique({ where: { id }, include: INCLUDE });

const findByEmployeeCode = (employeeCode) =>
  prisma.employee.findUnique({ where: { employeeCode } });

const findByEmail = (email) =>
  prisma.employee.findUnique({ where: { email } });

const findRoleById = (id) =>
  prisma.employeeRole.findUnique({ where: { id }, select: { id: true } });

const create = (data) => {
  const { roleId, ...employeeData } = data;
  return prisma.employee.create({
    data: {
      ...employeeData,
      role: { connect: { id: roleId } },
    },
    include: INCLUDE,
  });
};

const update = (id, data) => {
  const { roleId, ...rest } = data;
  return prisma.employee.update({
    where: { id },
    data: {
      ...rest,
      ...(roleId && { role: { connect: { id: roleId } } }),
    },
    include: INCLUDE,
  });
};

const updateBranches = (employeeId, branchIds) =>
  prisma.$transaction(async (tx) => {
    await tx.employeeBranch.deleteMany({ where: { employeeId } });
    if (branchIds.length > 0) {
      await tx.employeeBranch.createMany({
        data: branchIds.map((branchId, index) => ({
          employeeId,
          branchId,
          isPrimary: index === 0,
          isActive:  true,
        })),
      });
    }
    return tx.employee.findUnique({ where: { id: employeeId }, include: INCLUDE });
  });

module.exports = {
  findAll, count, findById,
  findByEmployeeCode, findByEmail,
  findRoleById,
  create, update, updateBranches,
};
