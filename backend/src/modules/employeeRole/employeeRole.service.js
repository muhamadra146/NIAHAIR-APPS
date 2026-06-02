const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update } = require("./employeeRole.repository");

const getAll = async ({ page, limit, search, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [roles, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    data: roles,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const role = await findById(id);
  if (!role) throw new AppError("Employee role not found", StatusCodes.NOT_FOUND);
  return role;
};

const createEmployeeRole = async (body) => {
  const existing = await findByCode(body.code);
  if (existing) throw new AppError("Employee role code already exists", StatusCodes.CONFLICT);

  return create(body);
};

const updateEmployeeRole = async (id, body) => {
  const role = await findById(id);
  if (!role) throw new AppError("Employee role not found", StatusCodes.NOT_FOUND);

  if (body.code && body.code !== role.code) {
    const existing = await findByCode(body.code);
    if (existing) throw new AppError("Employee role code already exists", StatusCodes.CONFLICT);
  }

  return update(id, body);
};

module.exports = { getAll, getById, createEmployeeRole, updateEmployeeRole };
