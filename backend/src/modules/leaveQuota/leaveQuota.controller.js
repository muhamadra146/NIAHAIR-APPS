const { success, created } = require("../../common/responses/apiResponse");
const svc = require("./leaveQuota.service");

const getQuotasController = async (req, res, next) => {
  try {
    const { employeeId, year } = req.query;
    const result = await svc.getQuotas({ employeeId, year });
    return success(res, result, "Quotas fetched");
  } catch (err) { next(err); }
};

const getMyQuotasController = async (req, res, next) => {
  try {
    const { year } = req.query;
    const result = await svc.getMyQuotas(req.user.employeeId, year);
    return success(res, result, "My quotas fetched");
  } catch (err) { next(err); }
};

const assignController = async (req, res, next) => {
  try {
    const result = await svc.assign(req.body);
    return created(res, result, "Quota assigned");
  } catch (err) { next(err); }
};

module.exports = { getQuotasController, getMyQuotasController, assignController };
