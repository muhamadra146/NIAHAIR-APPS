const prisma = require("../../config/prisma");

// ── Shared select shape — never exposes passwordHash ─────────────────

const EMPLOYEE_BRANCH_SELECT = {
  select: {
    id:        true,
    isPrimary: true,
    isActive:  true,
    branch:    { select: { id: true, code: true, name: true } },
  },
  where:   { isActive: true },
  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
};

const USER_SELECT = {
  id:         true,
  email:      true,
  username:   true,
  isActive:   true,
  employeeId: true,
  createdAt:  true,
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
};

// ── Read ──────────────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.user.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, select: USER_SELECT });

const count = (where) => prisma.user.count({ where });

const findById = (id) =>
  prisma.user.findUnique({ where: { id }, select: USER_SELECT });

const findByEmail = (email) =>
  prisma.user.findUnique({ where: { email }, select: { id: true } });

const findByUsername = (username) =>
  prisma.user.findUnique({ where: { username }, select: { id: true } });

const findByIdWithPassword = (id) =>
  prisma.user.findUnique({ where: { id }, select: { id: true, passwordHash: true } });

const findByEmployeeId = (employeeId) =>
  prisma.user.findUnique({ where: { employeeId }, select: { id: true } });

// ── Lookup helpers ────────────────────────────────────────────────────

const findUserRoleById = (id) =>
  prisma.userRole.findUnique({ where: { id }, select: { id: true, code: true } });

const findEmployeeById = (id) =>
  prisma.employee.findUnique({ where: { id }, select: { id: true, name: true } });

// ── Write ─────────────────────────────────────────────────────────────

const create = ({ username, email, passwordHash, userRoleId, employeeId }) =>
  prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      userRoleId,
      employeeId,
      isActive: true,
    },
    select: USER_SELECT,
  });

// API field is roleId; Prisma column is userRoleId — translate before writing.
const update = (id, data) => {
  const { roleId, ...rest } = data;
  return prisma.user.update({
    where:  { id },
    data:   { ...rest, ...(roleId !== undefined && { userRoleId: roleId }) },
    select: USER_SELECT,
  });
};

const updatePassword = (id, passwordHash) =>
  prisma.user.update({ where: { id }, data: { passwordHash }, select: { id: true } });

const deactivate = (id) =>
  prisma.user.update({ where: { id }, data: { isActive: false }, select: USER_SELECT });

const deleteById = (id) =>
  prisma.user.delete({ where: { id } });

module.exports = {
  findAll, count, findById, findByEmail, findByUsername, findByEmployeeId, findByIdWithPassword,
  findUserRoleById, findEmployeeById,
  create, update, updatePassword, deactivate, deleteById,
};
