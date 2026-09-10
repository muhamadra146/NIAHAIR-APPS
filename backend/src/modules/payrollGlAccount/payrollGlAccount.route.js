const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { getAllController, saveController } = require("./payrollGlAccount.controller");

const router = Router();

// GET  /payroll-gl-accounts  — semua role finance/admin
router.get("/", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE), getAllController);

// PUT  /payroll-gl-accounts  — SUPER_ADMIN saja
router.put("/", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), saveController);

module.exports = router;
