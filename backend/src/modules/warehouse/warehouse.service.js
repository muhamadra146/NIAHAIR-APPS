const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll, count, findById,
  findBranchById,
  updateBranchMapping, updateAccurateMapping,
} = require("./warehouse.repository");
const { syncWarehousesFromAccurate } = require("./warehouseAccurate.service");

// ── List ──────────────────────────────────────────────────────────────

const listWarehouses = async ({ page, limit, branchId, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (branchId) where.branchId = branchId;
  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [data, total] = await Promise.all([findAll({ skip, take, where }), count(where)]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single ────────────────────────────────────────────────────────────

const getWarehouseById = async (id) => {
  const warehouse = await findById(id);
  if (!warehouse) throw new AppError("Warehouse not found", StatusCodes.NOT_FOUND);
  return warehouse;
};

// ── Accurate sync ─────────────────────────────────────────────────────

const syncWarehouses = () => syncWarehousesFromAccurate();

// ── Branch mapping ────────────────────────────────────────────────────

const updateWarehouseBranchMapping = async (id, { branchId }) => {
  const warehouse = await findById(id);
  if (!warehouse) throw new AppError("Warehouse not found", StatusCodes.NOT_FOUND);

  const branch = await findBranchById(branchId);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  return updateBranchMapping(id, branchId);
};

// ── Accurate ID mapping (manual override) ────────────────────────────

const updateWarehouseMapping = async (id, { accurateWarehouseId }) => {
  const warehouse = await findById(id);
  if (!warehouse) throw new AppError("Warehouse not found", StatusCodes.NOT_FOUND);

  return updateAccurateMapping(id, accurateWarehouseId);
};

module.exports = {
  listWarehouses,
  getWarehouseById,
  syncWarehouses,
  updateWarehouseBranchMapping,
  updateWarehouseMapping,
};
