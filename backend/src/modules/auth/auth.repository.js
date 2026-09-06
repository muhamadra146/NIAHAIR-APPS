const prisma = require("../../config/prisma");

const EMPLOYEE_BRANCH_INCLUDE = {
  where:   { isActive: true },
  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  include: { branch: true },
};

const USER_AUTH_INCLUDE = {
  role: true,
  employee: {
    include: {
      role:             true,
      employeeBranches: EMPLOYEE_BRANCH_INCLUDE,
    },
  },
};

const findUserByEmail = (email) =>
  prisma.user.findUnique({ where: { email }, include: USER_AUTH_INCLUDE });

const findUserByUsername = (username) =>
  prisma.user.findUnique({ where: { username }, include: USER_AUTH_INCLUDE });

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

/**
 * Find user by email including sensitive fields needed for password reset.
 * Only use this in the forgot-password flow.
 */
const findUserByEmailRaw = (email) =>
  prisma.user.findUnique({
    where:  { email },
    select: {
      id:           true,
      email:        true,
      isActive:     true,
      passwordHash: true,
      employee:     { select: { name: true } },
    },
  });

/**
 * Find user by id including passwordHash.
 * Only use this in the reset-password flow.
 */
const findUserByIdRaw = (id) =>
  prisma.user.findUnique({
    where:  { id },
    select: {
      id:           true,
      isActive:     true,
      passwordHash: true,
    },
  });

/**
 * Update a user's passwordHash by id.
 */
const updatePasswordHash = (userId, newHash) =>
  prisma.user.update({
    where: { id: userId },
    data:  { passwordHash: newHash },
  });

// ── Refresh Token ─────────────────────────────────────────────────────────────

const createRefreshToken = (userId, tokenHash, expiresAt) =>
  prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

const findRefreshToken = (tokenHash) =>
  prisma.refreshToken.findUnique({
    where:   { tokenHash },
    include: { user: { include: { role: true } } },
  });

const deleteRefreshToken = (tokenHash) =>
  prisma.refreshToken.deleteMany({ where: { tokenHash } });

const deleteAllUserRefreshTokens = (userId) =>
  prisma.refreshToken.deleteMany({ where: { userId } });

const deleteExpiredRefreshTokens = () =>
  prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findAllBranches,
  findUserByEmailRaw,
  findUserByIdRaw,
  updatePasswordHash,
  createRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
  deleteExpiredRefreshTokens,
};
