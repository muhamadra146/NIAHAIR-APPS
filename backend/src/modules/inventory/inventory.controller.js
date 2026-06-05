const { success } = require("../../common/responses/apiResponse");
const { listStockMovements, listInventories } = require("./inventory.service");

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

module.exports = { getMovementsController, getInventoriesController };
