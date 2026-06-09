const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const requireBranch = require("../../middlewares/branch.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createInvoiceSchema, applyDepositSchema } = require("./invoice.validation");
const {
  getAllController,
  getByIdController,
  createController,
  applyDepositController,
  cancelController,
} = require("./invoice.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/",   authenticate, requireBranch, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER), validate(createInvoiceSchema), createController);
router.post(
  "/:invoiceId/deposits",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(applyDepositSchema),
  applyDepositController
);
router.patch("/:id/cancel", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER), cancelController);

module.exports = router;
