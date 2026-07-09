const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");
const { findAll, count, findById, findByItemCode, findCommissionCategoryById, create, update, findServiceMaterials } = require("./item.repository");
const { createSyncJob } = require("../syncQueue/syncQueue.service");

const ORDER_MAP = {
  name:         { name: "asc" },
  "-name":      { name: "desc" },
  itemCode:     { itemCode: "asc" },
  "-itemCode":  { itemCode: "desc" },
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
};

const getAll = async ({ page, limit, search, isActive, itemType, sortBy }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);

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
    findAll({ skip, take, where, orderBy }),
    count(where),
  ]);

  return {
    data: items,
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

  await createSyncJob({ entityType: "ITEM", entityId: item.id, direction: "APP_TO_ACCURATE" });

  return { item, message: "Item created and queued for Accurate sync" };
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

const getServiceMaterials = async (serviceItemId) => {
  const item = await findById(serviceItemId);
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);
  return findServiceMaterials(serviceItemId);
};

module.exports = { getAll, getById, createItem, updateItem, getServiceMaterials };
