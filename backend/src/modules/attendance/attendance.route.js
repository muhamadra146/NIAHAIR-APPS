const { Router }   = require("express");
const { StatusCodes } = require("http-status-codes");
const AppError      = require("../../common/errors/AppError");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const requireApprover = require("../../middlewares/approver.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const divisionAccess = require("../division/division.access");
const { checkInSchema, checkOutSchema, manualSetSchema } = require("./attendance.validation");
const {
  getDailyRosterController, getAllController, getByIdController,
  checkInController, checkOutController, manualSetController,
  getMyTodayController, getMyController, getReportController, getPresentController,
} = require("./attendance.controller");

const router = Router();

// Pantau kehadiran tim (roster, daftar, laporan): role pemantau + manager divisi role apa pun (EMP-033).
// Batas karyawan yang terlihat dicek di service (Owner/SA/Finance semua; lainnya satu divisi & cabang).
const MONITOR_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE, ROLES.FINANCE];
const allowMonitor = async (req, res, next) => {
  try {
    if (MONITOR_ROLES.includes(req.user?.roleCode)) return next();
    const scope = await divisionAccess.getScope(req.user);
    if (scope.manager) return next();
    return next(new AppError("Anda tidak berhak memantau kehadiran tim", StatusCodes.FORBIDDEN));
  } catch (err) { return next(err); }
};

// GET /attendance/roster?branchId=&date=   — daily roster with attendance status
router.get("/roster",
  authenticate,
  allowMonitor,
  getDailyRosterController,
);

// GET /attendance/report?branchId=&startDate=&endDate=&employeeId=
router.get("/report",
  authenticate,
  allowMonitor,
  getReportController,
);

// GET /attendance/present?branchId=&date= — karyawan hadir (pilihan staf Charge Lembur di Input Pekerjaan)
router.get("/present",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF_OPERASIONAL, ROLES.FINANCE),
  getPresentController,
);

// Self — must be before /:id
router.get("/my/today", authenticate, getMyTodayController);
router.get("/my",       authenticate, getMyController);

// BUG 6 FIX: Added authorize() — without it any authenticated user (including STAFF)
// could list all attendance records across the branch.
router.get("/",
  authenticate,
  allowMonitor,
  getAllController,
);
router.get("/:id",
  authenticate,
  allowMonitor,
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

// Absensi Manual (keputusan user 2026-10-19): hanya manager divisi karyawan atau Owner / Super Admin.
// Batas karyawan (satu divisi & cabang) dicek di service.
router.post("/manual",
  authenticate,
  requireApprover,
  validate(manualSetSchema),
  manualSetController,
);

module.exports = router;
