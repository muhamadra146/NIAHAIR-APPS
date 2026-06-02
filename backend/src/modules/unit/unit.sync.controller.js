const { success } = require("../../common/responses/apiResponse");
const { syncUnitsFromAccurate } = require("./unit.sync.service");

const syncFromAccurateController = async (req, res, next) => {
  try {
    const result = await syncUnitsFromAccurate();
    return success(res, result, "Accurate unit sync completed");
  } catch (err) {
    next(err);
  }
};

module.exports = { syncFromAccurateController };
