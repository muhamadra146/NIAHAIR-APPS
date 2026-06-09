const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByItemCode, findCommissionCategoryById, create, update } = require("./item.repository");
const { pushItemToAccurate } = require("./item.push.service");

const getAll = async ({ page, limit, search, isActive, itemType }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { itemCode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  if (itemType) {
    where.itemType = itemType;
  }

  const [items, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    items,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const item = await findById(id);
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);
  return item;
};

const createItem = async (body) => {
  const existing = await findByItemCode(body.itemCode);
  if (existing) throw new AppError("Item code already exists", StatusCodes.CONFLICT);

  const item = await create(body);

  // TODO: move to background sync job
  try {
    await pushItemToAccurate(item.id);
    const synced = await findById(item.id);
    return { item: synced, message: "Item created and synced to Accurate" };
  } catch (_err) {
    return { item, message: "Item created but pending Accurate sync" };
  }
};

const updateItem = async (id, body) => {
  const item = await findById(id);
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);

  if (body.itemCode && body.itemCode !== item.itemCode) {
    const existing = await findByItemCode(body.itemCode);
    if (existing) throw new AppError("Item code already exists", StatusCodes.CONFLICT);
  }

  if (body.commissionCategoryId !== undefined && body.commissionCategoryId !== null) {
    const category = await findCommissionCategoryById(body.commissionCategoryId);
    if (!category) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);
  }

  return update(id, body);
};

module.exports = { getAll, getById, createItem, updateItem };
