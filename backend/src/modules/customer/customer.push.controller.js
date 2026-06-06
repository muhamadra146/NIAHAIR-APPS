const { success } = require("../../common/responses/apiResponse");
const { pushCustomerToAccurate, repairMissingCustomerNo, retryFailedCustomerSync } = require("./customer.push.service");

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

const repairCustomerNoController = async (req, res, next) => {
  try {
    const result = await repairMissingCustomerNo();
    return success(res, result, `Repair complete: ${result.repaired} repaired, ${result.failed} failed`);
  } catch (err) {
    next(err);
  }
};

const retryCustomerSyncController = async (req, res, next) => {
  try {
    const result = await retryFailedCustomerSync();
    return success(res, result, `Retry complete: ${result.succeeded}/${result.retried} succeeded`);
  } catch (err) {
    next(err);
  }
};

module.exports = { syncToAccurateController, repairCustomerNoController, retryCustomerSyncController };
