const { success } = require("../../common/responses/apiResponse");
const { getSummaryReport, getRevenueReport, getCommissionReport } = require("./report.service");

const summaryController = async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const result = await getSummaryReport({ branchId, startDate, endDate });
    return success(res, result, "Summary report fetched");
  } catch (err) {
    next(err);
  }
};

const revenueController = async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const result = await getRevenueReport({ branchId, startDate, endDate });
    return success(res, result, "Revenue report fetched");
  } catch (err) {
    next(err);
  }
};

const commissionController = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await getCommissionReport({ startDate, endDate });
    return success(res, result, "Commission report fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { summaryController, revenueController, commissionController };
