const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { bulkScheduleSchema } = require("./staffSchedule.validation");
const {
  getRosterController,
  bulkUpsertController,
  getAvailableStaffController,
} = require("./staffSchedule.controller");

const router = Router();

// Fixed paths must come before parameterised routes
router.get("/available", authenticate, getAvailableStaffController);
router.get("/roster",    authenticate, getRosterController);

router.post(
  "/bulk",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(bulkScheduleSchema),
  bulkUpsertController,
);

module.exports = router;
