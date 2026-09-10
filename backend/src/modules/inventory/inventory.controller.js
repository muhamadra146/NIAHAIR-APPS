const { StatusCodes } = require("http-status-codes");
const { success } = require("../../common/responses/apiResponse");
const {
  listMovements,
  listInventories,
  generateServiceMovement,
  createStockAdjustment,
  createBatchStockAdjustment,
  createOpeningBalance,
  updateMinStock,
  listLowStock,
  getValuation,
} = require("./inventory.service");
const { syncInventoryFromAccurate } = require("./inventory.sync.service");
const {
  closePeriod,
  reopenPeriod,
  listPeriods,
} = require("./inventory.period.service");

const getMovementsController = async (req, res, next) => {
  try {
    const result = await listMovements(req.query);
    return success(res, result, "Inventory movements fetched");
  } catch (err) {
    next(err);
  }
};

const getInventoriesController = async (req, res, next) => {
  try {
    const result = await listInventories(req.query);
    return success(res, result, "Inventories fetched");
  } catch (err) {
    next(err);
  }
};

const syncController = async (req, res, next) => {
  try {
    const result = await syncInventoryFromAccurate();
    return success(res, result, "Inventory synced from Accurate");
  } catch (err) {
    next(err);
  }
};

const generateServiceMovementController = async (req, res, next) => {
  try {
    const { treatmentSessionId } = req.params;
    const createdByEmployeeId    = req.user?.employeeId ?? null;
    const result = await generateServiceMovement(treatmentSessionId, createdByEmployeeId);
    return success(res, result, `${result.created} service usage movement(s) created`);
  } catch (err) {
    next(err);
  }
};

const createAdjustmentController = async (req, res, next) => {
  try {
    const { id }              = req.params;
    const createdByEmployeeId = req.user?.employeeId ?? null;
    const result = await createStockAdjustment(id, { ...req.body, createdByEmployeeId });
    return success(res, result, "Penyesuaian stok berhasil dibuat");
  } catch (err) {
    next(err);
  }
};

const createBatchAdjustmentController = async (req, res, next) => {
  try {
    const createdByEmployeeId = req.user?.employeeId ?? null;
    const result = await createBatchStockAdjustment({ ...req.body, createdByEmployeeId });
    return success(res, result, `${result.adjustedCount} penyesuaian stok berhasil dibuat`);
  } catch (err) { next(err); }
};

const closePeriodController = async (req, res, next) => {
  try {
    const { year, month }    = req.body;
    const closedByEmployeeId = req.user?.employeeId ?? null;
    const result = await closePeriod(Number(year), Number(month), closedByEmployeeId);
    return success(res, result, `Inventory period ${year}-${String(month).padStart(2, "0")} closed`);
  } catch (err) {
    next(err);
  }
};

const reopenPeriodController = async (req, res, next) => {
  try {
    const { year, month } = req.body;
    const result = await reopenPeriod(Number(year), Number(month));
    return success(res, result, `Inventory period ${year}-${String(month).padStart(2, "0")} reopened`);
  } catch (err) {
    next(err);
  }
};

const getPeriodsController = async (req, res, next) => {
  try {
    const result = await listPeriods();
    return success(res, result, "Inventory periods fetched");
  } catch (err) {
    next(err);
  }
};

// ── GAP 2: Opening Balance ────────────────────────────────────────────────────
const createOpeningBalanceController = async (req, res, next) => {
  try {
    const { warehouseId, notes, items } = req.body;
    const result = await createOpeningBalance({
      warehouseId,
      notes,
      items,
      createdByEmployeeId: req.user?.employeeId ?? null,
    });
    return success(res, result, `Saldo awal dibuat: ${result.created} item (${result.skipped} dilewati)`, StatusCodes.CREATED);
  } catch (err) { next(err); }
};

// ── GAP 3: Min Stock ──────────────────────────────────────────────────────────
const updateMinStockController = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { minStock } = req.body;
    const result = await updateMinStock(id, minStock);
    return success(res, result, "Min stok berhasil diperbarui");
  } catch (err) { next(err); }
};

const getLowStockController = async (req, res, next) => {
  try {
    const { warehouseId, branchId } = req.query;
    const result = await listLowStock({ warehouseId, branchId });
    return success(res, result, `${result.length} item mendekati/di bawah min stok`);
  } catch (err) { next(err); }
};

// ── GAP 6: Valuation ──────────────────────────────────────────────────────────
const getValuationController = async (req, res, next) => {
  try {
    const { warehouseId, branchId } = req.query;
    const result = await getValuation({ warehouseId, branchId });
    return success(res, result, "Valuasi inventori berhasil dihitung");
  } catch (err) { next(err); }
};

module.exports = {
  getMovementsController,
  getInventoriesController,
  syncController,
  generateServiceMovementController,
  createAdjustmentController,
  createBatchAdjustmentController,
  closePeriodController,
  reopenPeriodController,
  getPeriodsController,
  createOpeningBalanceController,
  updateMinStockController,
  getLowStockController,
  getValuationController,
};
