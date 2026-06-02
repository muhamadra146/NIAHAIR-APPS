const { success } = require("../../common/responses/apiResponse");
const { pushItemToAccurate } = require("./item.push.service");

const syncToAccurateController = async (req, res, next) => {
  try {
    const result = await pushItemToAccurate(req.params.id);
    const message = result.alreadySynced
      ? "Item already synced to Accurate"
      : "Item synced to Accurate";
    return success(res, result, message);
  } catch (err) {
    next(err);
  }
};

module.exports = { syncToAccurateController };
