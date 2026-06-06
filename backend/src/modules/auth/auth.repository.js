const prisma = require("../../config/prisma");

const EMPLOYEE_BRANCH_SELECT = {
  select: {
    id:        true,
    isPrimary: true,
    isActive:  true,
    branch:    { select: { id: true, code: true, name: true } },
  },
  where: { isActive: true },
  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
};

const findUserByEmail = (email) =>
  prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
      employee: {
        select: {
          id:               true,
          name:             true,
          employeeCode:     true,
          role:             { select: { code: true, name: true } },
          employeeBranches: EMPLOYEE_BRANCH_SELECT,
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
        select: {
          id:               true,
          name:             true,
          employeeCode:     true,
          role:             { select: { code: true, name: true } },
          employeeBranches: EMPLOYEE_BRANCH_SELECT,
        },
      },
    },
  });

module.exports = { findUserByEmail, findUserById };
