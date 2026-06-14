const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update, deleteById, countRulesByCategory } = require("./commissionCategory.repository");

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

  const [categories, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data: categories, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const category = await findById(id);
  if (!category) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);
  return category;
};

const createCommissionCategory = async (body) => {
  const existing = await findByCode(body.code);
  if (existing) throw new AppError("Commission category code already exists", StatusCodes.CONFLICT);

  return create({
    code:     body.code,
    name:     body.name,
    isActive: body.isActive !== undefined ? body.isActive : true,
  });
};

const updateCommissionCategory = async (id, body) => {
  const category = await findById(id);
  if (!category) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);

  if (body.code && body.code !== category.code) {
    const existing = await findByCode(body.code);
    if (existing) throw new AppError("Commission category code already exists", StatusCodes.CONFLICT);
  }

  return update(id, body);
};

const deleteCommissionCategory = async (id) => {
  const category = await findById(id);
  if (!category) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);

  const rulesCount = await countRulesByCategory(id);
  if (rulesCount > 0) {
    throw new AppError(
      `Kategori ini digunakan oleh ${rulesCount} rule komisi. Hapus rule terlebih dahulu.`,
      StatusCodes.CONFLICT
    );
  }

  await deleteById(id);
};

module.exports = { getAll, getById, createCommissionCategory, updateCommissionCategory, deleteCommissionCategory };
