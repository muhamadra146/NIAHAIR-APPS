const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createDepositSchema } = require("./deposit.validation");
const {
  getAllController,
  getByIdController,
  createController,
  refundController,
  cancelController,
} = require("./deposit.controller");

// mergeParams: true — inherits :appointmentId when mounted at
// app.use("/appointments/:appointmentId/deposits", router)
const router = Router({ mergeParams: true });

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

// POST / is only meaningful via POST /appointments/:appointmentId/deposits
router.post(
  "/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(createDepositSchema),
  createController
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
