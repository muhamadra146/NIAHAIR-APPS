const bcrypt          = require("bcryptjs");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { ROLES }       = require("../../common/constants/role.constant");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll, count, findById, findByEmail, findByUsername, findByEmployeeId, findByIdWithPassword,
  findUserRoleById, findEmployeeById,
  create, update, updatePassword, deactivate, deleteById,
} = require("./user.repository");

const SALT_ROUNDS = 10;

// ── List ──────────────────────────────────────────────────────────────

const getAll = async ({ page, limit, search, isActive, branchId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (search) {
    where.OR = [
      { email:    { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { employee: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }
  if (branchId) {
    where.employee = {
      employeeBranches: { some: { branchId, isActive: true } },
    };
  }

  const [users, total] = await Promise.all([findAll({ skip, take, where }), count(where)]);
  return { data: users, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single — SUPER_ADMIN sees all; others only their own ──────────────

const getById = async (id, requestingUserId, requestingRoleCode) => {
  if (requestingRoleCode !== ROLES.SUPER_ADMIN && requestingUserId !== id) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }
  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
  return user;
};

// ── Create ────────────────────────────────────────────────────────────

const createUser = async ({ username, email, password, userRoleId, employeeId }) => {
  const existingUsername = await findByUsername(username);
  if (existingUsername) throw new AppError("Username sudah digunakan", StatusCodes.CONFLICT);

  const existing = await findByEmail(email);
  if (existing) throw new AppError("Email already exists", StatusCodes.CONFLICT);

  const role = await findUserRoleById(userRoleId);
  if (!role) throw new AppError("User role not found", StatusCodes.NOT_FOUND);

  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);

  const taken = await findByEmployeeId(employeeId);
  if (taken) throw new AppError("Employee already has a user account", StatusCodes.CONFLICT);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return create({ username, email, passwordHash, userRoleId, employeeId });
};

// ── Update ────────────────────────────────────────────────────────────

const updateUser = async (id, body) => {
  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  if (body.username !== undefined && body.username !== user.username) {
    const taken = await findByUsername(body.username);
    if (taken && taken.id !== id) throw new AppError("Username sudah digunakan", StatusCodes.CONFLICT);
  }

  if (body.roleId) {
    const role = await findUserRoleById(body.roleId);
    if (!role) throw new AppError("User role not found", StatusCodes.NOT_FOUND);
  }

  if (body.employeeId !== undefined && body.employeeId !== user.employeeId) {
    if (body.employeeId !== null) {
      const employee = await findEmployeeById(body.employeeId);
      if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);

      const taken = await findByEmployeeId(body.employeeId);
      if (taken) throw new AppError("Employee already has a user account", StatusCodes.CONFLICT);
    }
  }

  return update(id, body);
};

// ── Reset password (admin) ────────────────────────────────────────────

const resetPassword = async (id, { password }) => {
  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await updatePassword(id, passwordHash);
  return { id, message: "Password updated" };
};

// ── Change own password (self) ────────────────────────────────────────

const changeOwnPassword = async (id, { currentPassword, newPassword }) => {
  const user = await findByIdWithPassword(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new AppError("Password lama tidak sesuai", StatusCodes.UNAUTHORIZED);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await updatePassword(id, passwordHash);
  return { message: "Password berhasil diubah" };
};

// ── Soft deactivate ───────────────────────────────────────────────────

const deactivateUser = async (id) => {
  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  if (!user.isActive) throw new AppError("User is already inactive", StatusCodes.UNPROCESSABLE_ENTITY);

  return deactivate(id);
};

// ── Hard delete ───────────────────────────────────────────────────────

const deleteUser = async (id, requestingUserId) => {
  if (id === requestingUserId) {
    throw new AppError("Tidak bisa menghapus akun sendiri", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  await deleteById(id);
  return { id, message: "User berhasil dihapus" };
};

module.exports = { getAll, getById, createUser, updateUser, resetPassword, changeOwnPassword, deactivateUser, deleteUser };
