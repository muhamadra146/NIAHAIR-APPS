const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update, deactivate } = require("./userRole.repository");

const getAll = async ({ page, limit, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [roles, total] = await Promise.all([findAll({ skip, take, where }), count(where)]);
  return { data: roles, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const role = await findById(id);
  if (!role) throw new AppError("User role not found", StatusCodes.NOT_FOUND);
  return role;
};

const createUserRole = async ({ code, name }) => {
  const upperCode = code.toUpperCase();

  const existing = await findByCode(upperCode);
  if (existing) throw new AppError("User role code already exists", StatusCodes.CONFLICT);

  return create({ code: upperCode, name, isActive: true });
};

const updateUserRole = async (id, body) => {
  const role = await findById(id);
  if (!role) throw new AppError("User role not found", StatusCodes.NOT_FOUND);

  // Prevent code mutation — only name and isActive are editable
  const { code: _ignored, ...safeBody } = body;
  return update(id, safeBody);
};

const deactivateUserRole = async (id) => {
  const role = await findById(id);
  if (!role) throw new AppError("User role not found", StatusCodes.NOT_FOUND);

  if (!role.isActive) throw new AppError("User role is already inactive", StatusCodes.UNPROCESSABLE_ENTITY);

  return deactivate(id);
};

module.exports = { getAll, getById, createUserRole, updateUserRole, deactivateUserRole };
