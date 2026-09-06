const {
  getSummary, getDailyRevenue, getCommissionByEmployee, getSalesByItem,
  getInventoryReport, getProductionReport, getCustomerAnalytics,
} = require("./report.repository");

const getSummaryReport    = ({ branchId, startDate, endDate }) => getSummary({ branchId, startDate, endDate });
const getRevenueReport    = ({ branchId, startDate, endDate }) => getDailyRevenue({ branchId, startDate, endDate });
const getCommissionReport = ({ startDate, endDate })           => getCommissionByEmployee({ startDate, endDate });
const getSalesByItemReport = ({ branchId, startDate, endDate }) => getSalesByItem({ branchId, startDate, endDate });
const getInventoryReportService  = ({ branchId })                       => getInventoryReport({ branchId });
const getProductionReportService = ({ startDate, endDate })             => getProductionReport({ startDate, endDate });
const getCustomerAnalyticsService = ({ branchId, startDate, endDate }) => getCustomerAnalytics({ branchId, startDate, endDate });

module.exports = {
  getSummaryReport, getRevenueReport, getCommissionReport, getSalesByItemReport,
  getInventoryReportService, getProductionReportService, getCustomerAnalyticsService,
};
