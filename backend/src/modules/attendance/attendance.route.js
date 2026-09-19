const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { checkInSchema, checkOutSchema, manualSetSchema } = require("./attendance.validation");
const {
  getDailyRosterController, getAllController, getByIdController,
  checkInController, checkOutController, manualSetController,
  getMyTodayController, getMyController, getReportController,
} = require("./attendance.controller");

const router = Router();

// GET /attendance/roster?branchId=&date=   — daily roster with attendance status
router.get("/roster",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE, ROLES.FINANCE),
  getDailyRosterController,
);

// GET /attendance/report?branchId=&startDate=&endDate=&employeeId=
router.get("/report",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE, ROLES.FINANCE),
  getReportController,
);

// Self — must be before /:id
router.get("/my/today", authenticate, getMyTodayController);
router.get("/my",       authenticate, getMyController);

// BUG 6 FIX: Added authorize() — without it any authenticated user (including STAFF)
// could list all attendance records across the branch.
router.get("/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE, ROLES.FINANCE),
  getAllController,
);
router.get("/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE, ROLES.FINANCE),
  getByIdController,
);

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
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE),
  validate(manualSetSchema),
  manualSetController,
);

module.exports = router;
