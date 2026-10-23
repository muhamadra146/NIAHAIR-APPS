const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const requireApprover = require("../../middlewares/approver.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { createLeaveSchema } = require("./leave.validation");
const {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
  workingDaysController, cancelApprovedController,
} = require("./leave.controller");

const router = Router();

// OFFICE punya approval cuti sesuai access matrix

// Admin: all leaves
router.get("/",    authenticate, requireApprover, getAllController);

// Self: my leaves (before /:id to avoid conflict)
router.get("/my",  authenticate, getMyController);

// Pratinjau durasi cuti dalam hari kerja (OFF & libur nasional tidak dihitung)
router.get("/working-days", authenticate, workingDaysController);

// Single
router.get("/:id", authenticate, getByIdController);

// Create request (any authenticated user with employeeId)
router.post("/", authenticate, validate(createLeaveSchema), createController);

// Approve / Reject (managers)
router.post("/:id/approve", authenticate, requireApprover, approveController);
router.post("/:id/reject",  authenticate, requireApprover, rejectController);

// Batalkan cuti yang sudah disetujui (belum dimulai) — Owner / SA / manager divisi
router.post("/:id/cancel",  authenticate, requireApprover, cancelApprovedController);

// Cancel own pending leave
router.delete("/:id", authenticate, cancelController);

module.exports = router;
