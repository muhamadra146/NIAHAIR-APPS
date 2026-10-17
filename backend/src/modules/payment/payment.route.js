const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const requireBranch = require("../../middlewares/branch.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createPaymentSchema } = require("./payment.validation");
const {
  getAllController,
  getByIdController,
  createController,
  deleteController,
  summaryController,
} = require("./payment.controller");

// mergeParams: true — inherits :invoiceId when mounted at
// app.use("/invoices/:invoiceId/payments", router)
const router = Router({ mergeParams: true });

// Baca pembayaran invoice (R2a): hanya peran dengan menu POS / Pembayaran Invoice —
// POS (Super Admin, Owner, Manager, Kasir) + Finance (lihat saja). INVENTORY dll tidak.
const PAYMENT_READ_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.FINANCE];

router.get("/summary",    authenticate, authorize(...PAYMENT_READ_ROLES), summaryController);
router.get("/",           authenticate, authorize(...PAYMENT_READ_ROLES), getAllController);
router.get("/:id",        authenticate, authorize(...PAYMENT_READ_ROLES), getByIdController);
router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER),
  deleteController,
);

router.post(
  "/",
  authenticate,
  requireBranch,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER),
  validate(createPaymentSchema),
  createController
);

module.exports = router;
