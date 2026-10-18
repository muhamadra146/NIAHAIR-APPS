'use strict';

const { success }           = require("../../common/responses/apiResponse");
const { getFinanceDashboard, getFinanceDetails } = require("./dashboard.service");

const financeDashboardController = async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const result = await getFinanceDashboard({ branchId, startDate, endDate });
    return success(res, result, "Finance dashboard fetched");
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/finance/details?type=revenue|purchases — data di balik kartu dashboard
const financeDetailsController = async (req, res, next) => {
  try {
    const { type, branchId, startDate, endDate } = req.query;
    const result = await getFinanceDetails({ type, branchId, startDate, endDate, roleCode: req.user?.roleCode });
    return success(res, result, "Finance dashboard details fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { financeDashboardController, financeDetailsController };
