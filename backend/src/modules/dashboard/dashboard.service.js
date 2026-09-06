'use strict';

const {
  getRevenueSummary,
  getCashReceivedSummary,
  getPurchaseSummary,
  getCommissionSummary,
  getPayrollSummary,
  getDailyTrend,
} = require("./dashboard.repository");

/**
 * Aggregasi Finance Dashboard.
 *
 * @param {{ branchId?: string, startDate?: string, endDate?: string }} params
 */
const getFinanceDashboard = async ({ branchId, startDate, endDate }) => {
  const [revenue, cashReceived, purchases, commissions, payroll, dailyTrend] =
    await Promise.all([
      getRevenueSummary({ branchId, startDate, endDate }),
      getCashReceivedSummary({ branchId, startDate, endDate }),
      getPurchaseSummary({ startDate, endDate }),
      getCommissionSummary({ startDate, endDate }),
      getPayrollSummary({ branchId, startDate, endDate }),
      getDailyTrend({ branchId, startDate, endDate }),
    ]);

  // Net cash flow = uang masuk - belanja - komisi terbayar - gaji terbayar
  const netCashFlow =
    cashReceived.total -
    purchases.total   -
    commissions.total -
    payroll.total;

  return {
    period: { startDate, endDate },
    revenue,
    cashReceived,
    purchases,
    commissions,
    payroll,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    dailyTrend,
  };
};

module.exports = { getFinanceDashboard };
