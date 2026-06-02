const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.employee.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
    include: {
      branch: { select: { id: true, name: true } },
      role: { select: { id: true, code: true, name: true } },
    },
  });

const count = (where) => prisma.employee.count({ where });

const findById = (id) =>
  prisma.employee.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      role: { select: { id: true, code: true, name: true } },
    },
  });

const findByEmployeeCode = (employeeCode) =>
  prisma.employee.findUnique({ where: { employeeCode } });

const findByEmail = (email) =>
  prisma.employee.findUnique({ where: { email } });

const findBranchById = (id) =>
  prisma.branch.findUnique({ where: { id }, select: { id: true } });

const findRoleById = (id) =>
  prisma.employeeRole.findUnique({ where: { id }, select: { id: true } });

const create = (data) => {
  const { branchId, roleId, ...employeeData } = data;

  return prisma.employee.create({
    data: {
      ...employeeData,
      branch: { connect: { id: branchId } },
      role:   { connect: { id: roleId } },
    },
    include: {
      branch: { select: { id: true, name: true } },
      role: { select: { id: true, code: true, name: true } },
    },
  });
};

const update = (id, data) => {
  const { branchId, roleId, ...rest } = data;

  return prisma.employee.update({
    where: { id },
    data: {
      ...rest,
      ...(branchId && { branch: { connect: { id: branchId } } }),
      ...(roleId && { role: { connect: { id: roleId } } }),
    },
    include: {
      branch: { select: { id: true, name: true } },
      role: { select: { id: true, code: true, name: true } },
    },
  });
};

module.exports = { findAll, count, findById, findByEmployeeCode, findByEmail, findBranchById, findRoleById, create, update };
