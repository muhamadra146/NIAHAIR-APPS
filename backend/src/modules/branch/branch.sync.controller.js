const { success } = require("../../common/responses/apiResponse");
const { syncBranchesFromAccurate } = require("./branch.sync.service");

const syncFromAccurateController = async (req, res, next) => {
  try {
    const result = await syncBranchesFromAccurate();
    return success(res, result, "Accurate branch sync completed");
  } catch (err) {
    next(err);
  }
};

module.exports = { syncFromAccurateController };
