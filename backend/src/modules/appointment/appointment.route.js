const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const requireBranch = require("../../middlewares/branch.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeStatusSchema,
} = require("./appointment.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  changeStatusController,
} = require("./appointment.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

router.post(
  "/",
  authenticate,
  requireBranch,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.STAFF),
  validate(createAppointmentSchema),
  createController
);

router.patch(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(updateAppointmentSchema),
  updateController
);

// /:id/status must be declared after /:id — different path depth, no conflict
router.patch(
  "/:id/status",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(changeStatusSchema),
  changeStatusController
);

module.exports = router;
