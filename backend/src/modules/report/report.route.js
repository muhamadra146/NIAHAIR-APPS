const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const { summaryController, revenueController, commissionController, salesByItemController } = require("./report.controller");

const router = Router();

router.get("/summary",       authenticate, summaryController);
router.get("/revenue",       authenticate, revenueController);
router.get("/commissions",   authenticate, commissionController);
router.get("/sales-by-item", authenticate, salesByItemController);

module.exports = router;
