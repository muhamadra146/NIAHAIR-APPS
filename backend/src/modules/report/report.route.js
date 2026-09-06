const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const {
  summaryController, revenueController, commissionController, salesByItemController,
  inventoryReportController, productionReportController, customerAnalyticsController,
} = require("./report.controller");

const router = Router();

router.get("/summary",            authenticate, summaryController);
router.get("/revenue",            authenticate, revenueController);
router.get("/commissions",        authenticate, commissionController);
router.get("/sales-by-item",      authenticate, salesByItemController);
router.get("/inventory",          authenticate, inventoryReportController);
router.get("/production",         authenticate, productionReportController);
router.get("/customer-analytics", authenticate, customerAnalyticsController);

module.exports = router;
