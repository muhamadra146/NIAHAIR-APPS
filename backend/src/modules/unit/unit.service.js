const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById } = require("./unit.repository");

const getAll = async ({ page, limit, search, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const where = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [units, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data: units, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const unit = await findById(id);
  if (!unit) throw new AppError("Unit not found", StatusCodes.NOT_FOUND);
  return unit;
};

module.exports = { getAll, getById };
