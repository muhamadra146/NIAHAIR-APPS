'use strict';

const { success }           = require("../../common/responses/apiResponse");
const { getFinanceDashboard } = require("./dashboard.service");

const financeDashboardController = async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const result = await getFinanceDashboard({ branchId, startDate, endDate });
    return success(res, result, "Finance dashboard fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { financeDashboardController };
