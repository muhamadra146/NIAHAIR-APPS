'use strict';

const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { syncSuppliersController, getSuppliersController } = require("./supplier.controller");

const router = Router();

router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncSuppliersController);
router.get("/",               authenticate, getSuppliersController);

module.exports = router;
