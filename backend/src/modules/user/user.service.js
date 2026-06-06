const bcrypt       = require("bcryptjs");
const { StatusCodes } = require("http-status-codes");
const AppError     = require("../../common/errors/AppError");
const { ROLES }    = require("../../common/constants/role.constant");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll, count, findById, findByEmail, findByEmployeeId,
  findUserRoleById, findEmployeeById,
  create, update, updatePassword, deactivate,
} = require("./user.repository");

const SALT_ROUNDS = 10;

// ── List ──────────────────────────────────────────────────────────────

const getAll = async ({ page, limit, search, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
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

const createUser = async ({ email, password, userRoleId, employeeId }) => {
  const existing = await findByEmail(email);
  if (existing) throw new AppError("Email already exists", StatusCodes.CONFLICT);

  const role = await findUserRoleById(userRoleId);
  if (!role) throw new AppError("User role not found", StatusCodes.NOT_FOUND);

  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);

  const taken = await findByEmployeeId(employeeId);
  if (taken) throw new AppError("Employee already has a user account", StatusCodes.CONFLICT);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return create({ email, passwordHash, userRoleId, employeeId });
};

// ── Update ────────────────────────────────────────────────────────────

const updateUser = async (id, body) => {
  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

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

// ── Reset password ────────────────────────────────────────────────────

const resetPassword = async (id, { password }) => {
  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await updatePassword(id, passwordHash);
  return { id, message: "Password updated" };
};

// ── Soft deactivate ───────────────────────────────────────────────────

const deactivateUser = async (id) => {
  const user = await findById(id);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  if (!user.isActive) throw new AppError("User is already inactive", StatusCodes.UNPROCESSABLE_ENTITY);

  return deactivate(id);
};

module.exports = { getAll, getById, createUser, updateUser, resetPassword, deactivateUser };
