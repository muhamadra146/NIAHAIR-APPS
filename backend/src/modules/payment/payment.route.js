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

router.get("/summary",    authenticate, summaryController);
router.get("/",           authenticate, getAllController);
router.get("/:id",        authenticate, getByIdController);
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
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(createPaymentSchema),
  createController
);

module.exports = router;
