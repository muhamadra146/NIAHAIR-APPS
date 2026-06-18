const prisma = require("../../config/prisma");

const INCLUDE = {
  role:       { select: { id: true, code: true, name: true } },
  homeBranch: { select: { id: true, code: true, name: true } },
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

const findLastEmployeeCode = () =>
  prisma.employee.findFirst({
    where:   { employeeCode: { startsWith: "EMP" } },
    orderBy: { employeeCode: "desc" },
    select:  { employeeCode: true },
  });

const findByEmail = (email) =>
  prisma.employee.findUnique({ where: { email } });

const findRoleById = (id) =>
  prisma.employeeRole.findUnique({ where: { id }, select: { id: true } });

const create = (data) => {
  const { roleId, homeBranchId, ...rest } = data;
  return prisma.employee.create({
    data: {
      ...rest,
      role: { connect: { id: roleId } },
      ...(homeBranchId && { homeBranch: { connect: { id: homeBranchId } } }),
    },
    include: INCLUDE,
  });
};

const update = (id, data) => {
  const { roleId, homeBranchId, ...rest } = data;

  let homeBranchWrite;
  if (homeBranchId)          homeBranchWrite = { connect: { id: homeBranchId } };
  else if (homeBranchId === null) homeBranchWrite = { disconnect: true };

  return prisma.employee.update({
    where: { id },
    data: {
      ...rest,
      ...(roleId        && { role:       { connect: { id: roleId } } }),
      ...(homeBranchWrite && { homeBranch: homeBranchWrite }),
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

const softDelete = (id) =>
  prisma.employee.update({ where: { id }, data: { isActive: false } });

module.exports = {
  findAll, count, findById,
  findByEmployeeCode, findLastEmployeeCode, findByEmail,
  findRoleById,
  create, update, updateBranches, softDelete,
};
