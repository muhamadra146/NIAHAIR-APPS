const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update, softDelete, countActiveEmployees } = require("./branch.repository");

const getAll = async ({ page, limit, search, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [branches, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    data: branches,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);
  return branch;
};

const createBranch = async (body) => {
  const existing = await findByCode(body.code);
  if (existing) throw new AppError("Branch code already exists", StatusCodes.CONFLICT);

  return create(body);
};

const updateBranch = async (id, body) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  if (body.code && body.code !== branch.code) {
    const existing = await findByCode(body.code);
    if (existing) throw new AppError("Branch code already exists", StatusCodes.CONFLICT);
  }

  return update(id, body);
};

const deleteBranch = async (id) => {
  const branch = await findById(id);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  const empCount = await countActiveEmployees(id);
  if (empCount > 0)
    throw new AppError(`Tidak bisa dihapus: ${empCount} karyawan masih terdaftar di cabang ini`, StatusCodes.CONFLICT);

  return softDelete(id);
};

module.exports = { getAll, getById, createBranch, updateBranch, deleteBranch };
