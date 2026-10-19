'use strict';

const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { syncSuppliersController, getSuppliersController } = require("./supplier.controller");

const router = Router();

// B3 fix: OWNER punya akses yang sama dengan SUPER_ADMIN
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), syncSuppliersController);
// Lihat pemasok: peran menu Supplier / Pembelian / Retur Pembelian (sidebar) — U1
router.get("/", authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY, ROLES.FINANCE, ROLES.OFFICE),
  getSuppliersController);

module.exports = router;
