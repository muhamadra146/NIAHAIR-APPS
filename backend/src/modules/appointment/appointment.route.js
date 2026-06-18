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
  rescheduleSchema,
} = require("./appointment.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  changeStatusController,
  rescheduleController,
  deleteController,
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

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER),
  deleteController
);

// /:id/status must be declared after /:id — different path depth, no conflict
router.patch(
  "/:id/status",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(changeStatusSchema),
  changeStatusController
);

router.patch(
  "/:id/reschedule",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  validate(rescheduleSchema),
  rescheduleController
);

module.exports = router;
