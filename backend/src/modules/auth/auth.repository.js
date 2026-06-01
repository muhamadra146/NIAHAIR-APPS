const prisma = require("../../config/prisma");

const findUserByEmail = (email) => {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
      branch: { select: { id: true, code: true, name: true } },
    },
  });
};

const findUserById = (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      branchId: true,
      isActive: true,
      role: { select: { id: true, code: true, name: true } },
      branch: { select: { id: true, code: true, name: true } },
    },
  });
};

module.exports = { findUserByEmail, findUserById };
