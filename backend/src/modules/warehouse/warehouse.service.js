const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll, count, findById,
  findBranchById,
  updateBranchMapping, updateAccurateMapping, hardDelete,
} = require("./warehouse.repository");
const { syncWarehousesFromAccurate } = require("./warehouseAccurate.service");
const prisma = require("../../config/prisma");

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

const removeWarehouseBranchMapping = async (id) => {
  const warehouse = await findById(id);
  if (!warehouse) throw new AppError("Warehouse not found", StatusCodes.NOT_FOUND);
  return updateBranchMapping(id, null);
};

// ── Accurate ID mapping (manual override) ────────────────────────────

const updateWarehouseMapping = async (id, { accurateWarehouseId }) => {
  const warehouse = await findById(id);
  if (!warehouse) throw new AppError("Warehouse not found", StatusCodes.NOT_FOUND);

  return updateAccurateMapping(id, accurateWarehouseId);
};

const deleteWarehouse = async (id) => {
  const warehouse = await findById(id);
  if (!warehouse) throw new AppError("Warehouse not found", StatusCodes.NOT_FOUND);

  // Guard: cek relasi sebelum hard delete
  const [inventoryCount, transferCount, purchaseCount] = await Promise.all([
    prisma.inventory.count({ where: { warehouseId: id } }),
    prisma.stockTransfer.count({
      where: { OR: [{ sourceWarehouseId: id }, { destinationWarehouseId: id }] },
    }),
    prisma.purchaseInvoice.count({ where: { warehouseId: id } }),
  ]);

  if (inventoryCount > 0)
    throw new AppError(
      `Tidak bisa dihapus: ${inventoryCount} data inventory masih terhubung ke warehouse ini`,
      StatusCodes.CONFLICT
    );
  if (transferCount > 0)
    throw new AppError(
      `Tidak bisa dihapus: ${transferCount} stock transfer masih menggunakan warehouse ini`,
      StatusCodes.CONFLICT
    );
  if (purchaseCount > 0)
    throw new AppError(
      `Tidak bisa dihapus: ${purchaseCount} purchase invoice masih terhubung ke warehouse ini`,
      StatusCodes.CONFLICT
    );

  return hardDelete(id);
};

module.exports = {
  listWarehouses,
  getWarehouseById,
  syncWarehouses,
  updateWarehouseBranchMapping,
  removeWarehouseBranchMapping,
  updateWarehouseMapping,
  deleteWarehouse,
};
