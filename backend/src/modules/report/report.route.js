const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  summaryController, revenueController, commissionController, salesByItemController,
  inventoryReportController, productionReportController, customerAnalyticsController,
} = require("./report.controller");

const router = Router();

// Laporan operasional & keuangan — MANAGEMENT + INVENTORY + OFFICE + FINANCE
const REPORT_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER,
  ROLES.INVENTORY, ROLES.OFFICE, ROLES.FINANCE,
];

router.get("/summary",            authenticate, authorize(...REPORT_ROLES), summaryController);
router.get("/revenue",            authenticate, authorize(...REPORT_ROLES), revenueController);
router.get("/commissions",        authenticate, authorize(...REPORT_ROLES), commissionController);
router.get("/sales-by-item",      authenticate, authorize(...REPORT_ROLES), salesByItemController);
router.get("/inventory",          authenticate, authorize(...REPORT_ROLES), inventoryReportController);
router.get("/production",         authenticate, authorize(...REPORT_ROLES), productionReportController);
router.get("/customer-analytics", authenticate, authorize(...REPORT_ROLES), customerAnalyticsController);

module.exports = router;
