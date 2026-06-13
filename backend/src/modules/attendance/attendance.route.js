const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { checkInSchema, checkOutSchema, manualSetSchema } = require("./attendance.validation");
const {
  getDailyRosterController, getAllController, getByIdController,
  checkInController, checkOutController, manualSetController,
} = require("./attendance.controller");

const router = Router();

// GET /attendance/roster?branchId=&date=   — daily roster with attendance status
router.get("/roster",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN),
  getDailyRosterController,
);

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

// Employee self check-in / check-out
router.post("/check-in",
  authenticate,
  validate(checkInSchema),
  checkInController,
);

router.post("/check-out",
  authenticate,
  validate(checkOutSchema),
  checkOutController,
);

// Admin/Manager manual set
router.post("/manual",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN),
  validate(manualSetSchema),
  manualSetController,
);

module.exports = router;
