const { StatusCodes } = require("http-status-codes");
const { success } = require("../../common/responses/apiResponse");
const {
  listMovements,
  listInventories,
  generateServiceMovement,
} = require("./inventory.service");
const { syncInventoryFromAccurate } = require("./inventory.sync.service");
const {
  closePeriod,
  reopenPeriod,
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

module.exports = {
  getMovementsController,
  getInventoriesController,
  syncController,
  generateServiceMovementController,
  closePeriodController,
  reopenPeriodController,
};
