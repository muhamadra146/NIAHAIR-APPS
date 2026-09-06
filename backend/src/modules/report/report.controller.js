const { success } = require("../../common/responses/apiResponse");
const {
  getSummaryReport, getRevenueReport, getCommissionReport, getSalesByItemReport,
  getInventoryReportService, getProductionReportService, getCustomerAnalyticsService,
} = require("./report.service");

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

const salesByItemController = async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const result = await getSalesByItemReport({ branchId, startDate, endDate });
    return success(res, result, "Sales by item report fetched");
  } catch (err) {
    next(err);
  }
};

const inventoryReportController = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const result = await getInventoryReportService({ branchId });
    return success(res, result, "Inventory report fetched");
  } catch (err) {
    next(err);
  }
};

const productionReportController = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await getProductionReportService({ startDate, endDate });
    return success(res, result, "Production report fetched");
  } catch (err) {
    next(err);
  }
};

const customerAnalyticsController = async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const result = await getCustomerAnalyticsService({ branchId, startDate, endDate });
    return success(res, result, "Customer analytics fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  summaryController, revenueController, commissionController, salesByItemController,
  inventoryReportController, productionReportController, customerAnalyticsController,
};
