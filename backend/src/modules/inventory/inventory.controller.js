const { success } = require("../../common/responses/apiResponse");
const { listStockMovements, listInventories } = require("./inventory.service");
const { syncInventoryFromAccurate }           = require("./inventory.sync.service");

const getMovementsController = async (req, res, next) => {
  try {
    const result = await listStockMovements(req.query);
    return success(res, result, "Stock movements fetched");
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
  } catch (err) { next(err); }
};

module.exports = { getMovementsController, getInventoriesController, syncController };
