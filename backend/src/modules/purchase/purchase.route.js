'use strict';

const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createPurchaseInvoiceSchema, updatePurchaseInvoiceSchema } = require("./purchase.validation");
const {
  listController,
  getController,
  createController,
  updateController,
  cancelController,
  deleteController,
  lastPriceController,
} = require("./purchase.controller");

const router = Router();

// OFFICE hanya view; INVENTORY + FINANCE bisa buat/edit
const VIEW_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY, ROLES.FINANCE, ROLES.OFFICE];
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY, ROLES.FINANCE];

router.get("/",                              authenticate, authorize(...VIEW_ROLES), listController);
router.get("/items/:itemId/last-price",      authenticate, authorize(...VIEW_ROLES), lastPriceController);
router.get("/:id",                           authenticate, authorize(...VIEW_ROLES), getController);

router.post(
  "/",
  authenticate, authorize(...WRITE_ROLES),
  validate(createPurchaseInvoiceSchema),
  createController
);

router.patch(
  "/:id",
  authenticate, authorize(...WRITE_ROLES),
  validate(updatePurchaseInvoiceSchema),
  updateController
);

router.post("/:id/cancel", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), cancelController);
router.delete("/:id",      authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), deleteController);

module.exports = router;
