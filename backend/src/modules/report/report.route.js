const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const { summaryController, revenueController, commissionController } = require("./report.controller");

const router = Router();

router.get("/summary",     authenticate, summaryController);
router.get("/revenue",     authenticate, revenueController);
router.get("/commissions", authenticate, commissionController);

module.exports = router;
