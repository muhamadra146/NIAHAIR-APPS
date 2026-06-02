const { success } = require("../../common/responses/apiResponse");
const { syncCustomersFromAccurate } = require("./customer.sync.service");

const syncFromAccurateController = async (req, res, next) => {
  try {
    const result = await syncCustomersFromAccurate();
    return success(res, result, "Accurate customer sync completed");
  } catch (err) {
    next(err);
  }
};

module.exports = { syncFromAccurateController };
