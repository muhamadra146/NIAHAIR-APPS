const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const requireBranch = require("../../middlewares/branch.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createDepositSchema, updateDepositSchema, linkAppointmentSchema } = require("./deposit.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  deleteController,
  refundController,
  cancelController,
  linkAppointmentController,
} = require("./deposit.controller");

// mergeParams: true — inherits :appointmentId when mounted at
// app.use("/appointments/:appointmentId/deposits", router)
const router = Router({ mergeParams: true });

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

router.post(
  "/",
  authenticate,
  requireBranch,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.STAFF),
  validate(createDepositSchema),
  createController
);

router.patch(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER),
  validate(updateDepositSchema),
  updateController
);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER),
  deleteController
);

router.patch(
  "/:id/link-appointment",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(linkAppointmentSchema),
  linkAppointmentController
);

router.patch(
  "/:id/refund",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  refundController
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  cancelController
);

module.exports = router;
