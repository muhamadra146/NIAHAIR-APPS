const { getSummary, getDailyRevenue, getCommissionByEmployee, getSalesByItem } = require("./report.repository");

const getSummaryReport = ({ branchId, startDate, endDate }) =>
  getSummary({ branchId, startDate, endDate });

const getRevenueReport = ({ branchId, startDate, endDate }) =>
  getDailyRevenue({ branchId, startDate, endDate });

const getCommissionReport = ({ startDate, endDate }) =>
  getCommissionByEmployee({ startDate, endDate });

const getSalesByItemReport = ({ branchId, startDate, endDate }) =>
  getSalesByItem({ branchId, startDate, endDate });

module.exports = { getSummaryReport, getRevenueReport, getCommissionReport, getSalesByItemReport };
