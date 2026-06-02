const { success } = require("../../common/responses/apiResponse");
const { syncItemsFromAccurate } = require("./item.sync.service");

const syncFromAccurateController = async (req, res, next) => {
  try {
    const result = await syncItemsFromAccurate();
    return success(res, result, "Accurate item sync completed");
  } catch (err) {
    next(err);
  }
};

module.exports = { syncFromAccurateController };
