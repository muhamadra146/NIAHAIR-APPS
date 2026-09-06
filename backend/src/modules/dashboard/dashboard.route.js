'use strict';

const { Router }     = require("express");
const authenticate   = require("../../middlewares/auth.middleware");
const { financeDashboardController } = require("./dashboard.controller");

const router = Router();

// GET /api/v1/dashboard/finance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&branchId=
router.get("/finance", authenticate, financeDashboardController);

module.exports = router;
