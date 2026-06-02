const { success } = require("../../common/responses/apiResponse");
const { pushCustomerToAccurate } = require("./customer.push.service");

const syncToAccurateController = async (req, res, next) => {
  try {
    const result = await pushCustomerToAccurate(req.params.id);
    const message = result.alreadySynced
      ? "Customer already synced to Accurate"
      : "Customer synced to Accurate";
    return success(res, result, message);
  } catch (err) {
    next(err);
  }
};

module.exports = { syncToAccurateController };
