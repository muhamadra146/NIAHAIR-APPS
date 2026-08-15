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

const ALLOWED = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER];

router.get("/",                              authenticate, authorize(...ALLOWED), listController);
router.get("/items/:itemId/last-price",      authenticate, authorize(...ALLOWED), lastPriceController);
router.get("/:id",                           authenticate, authorize(...ALLOWED), getController);

router.post(
  "/",
  authenticate, authorize(...ALLOWED),
  validate(createPurchaseInvoiceSchema),
  createController
);

router.patch(
  "/:id",
  authenticate, authorize(...ALLOWED),
  validate(updatePurchaseInvoiceSchema),
  updateController
);

router.post("/:id/cancel", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), cancelController);
router.delete("/:id",      authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), deleteController);

module.exports = router;
