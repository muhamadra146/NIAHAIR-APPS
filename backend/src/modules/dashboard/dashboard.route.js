'use strict';

const { Router }     = require("express");
const authenticate   = require("../../middlewares/auth.middleware");
const authorize      = require("../../middlewares/role.middleware");
const { ROLES }      = require("../../common/constants/role.constant");
const { financeDashboardController, financeDetailsController } = require("./dashboard.controller");

const router = Router();

// Finance dashboard — MANAGEMENT + FINANCE
const FINANCE_DASH_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE];

// GET /api/v1/dashboard/finance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&branchId=
router.get("/finance", authenticate, authorize(...FINANCE_DASH_ROLES), financeDashboardController);
// GET /api/v1/dashboard/finance/details?type=revenue|purchases&startDate=&endDate=&branchId=
router.get("/finance/details", authenticate, authorize(...FINANCE_DASH_ROLES), financeDetailsController);

module.exports = router;
