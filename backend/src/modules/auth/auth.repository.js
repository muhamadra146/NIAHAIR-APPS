const prisma = require("../../config/prisma");

const EMPLOYEE_BRANCH_INCLUDE = {
  where:   { isActive: true },
  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  include: { branch: true },
};

const findUserByEmail = (email) =>
  prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
      employee: {
        include: {
          role:             true,
          employeeBranches: EMPLOYEE_BRANCH_INCLUDE,
        },
      },
    },
  });

const findUserById = (id) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id:         true,
      email:      true,
      employeeId: true,
      isActive:   true,
      role:     { select: { id: true, code: true, name: true } },
      employee: {
        include: {
          role:             true,
          employeeBranches: EMPLOYEE_BRANCH_INCLUDE,
        },
      },
    },
  });

const findAllBranches = () =>
  prisma.branch.findMany({
    select:  { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

module.exports = { findUserByEmail, findUserById, findAllBranches };
