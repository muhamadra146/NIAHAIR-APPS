const { getSummary, getDailyRevenue, getCommissionByEmployee } = require("./report.repository");

const getSummaryReport = ({ branchId, startDate, endDate }) =>
  getSummary({ branchId, startDate, endDate });

const getRevenueReport = ({ branchId, startDate, endDate }) =>
  getDailyRevenue({ branchId, startDate, endDate });

const getCommissionReport = ({ startDate, endDate }) =>
  getCommissionByEmployee({ startDate, endDate });

module.exports = { getSummaryReport, getRevenueReport, getCommissionReport };
