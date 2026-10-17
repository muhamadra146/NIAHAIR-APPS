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
  updateRescheduleController,
  deleteController,
} = require("./appointment.controller");

const router = Router();

// Hak akses mengikuti menu (sidebarNav):
//   Baca : Booking (POS + OFFICE/FINANCE lihat saja) + Booking Harian / Dashboard staf (STAFF_OPERASIONAL)
//   Tulis: POS saja — OFFICE, FINANCE & STAFF_OPERASIONAL view-only. INVENTORY tidak punya menu booking.
const READ_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.STAFF_OPERASIONAL, ROLES.OFFICE, ROLES.FINANCE];
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];

router.get("/",    authenticate, authorize(...READ_ROLES), getAllController);
router.get("/:id", authenticate, authorize(...READ_ROLES), getByIdController);

router.post(
  "/",
  authenticate,
  requireBranch,
  authorize(...WRITE_ROLES),
  validate(createAppointmentSchema),
  createController
);

router.patch(
  "/:id",
  authenticate,
  authorize(...WRITE_ROLES),
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
  authorize(...WRITE_ROLES),
  validate(changeStatusSchema),
  changeStatusController
);

router.patch(
  "/:id/reschedule",
  authenticate,
  authorize(...WRITE_ROLES),
  validate(rescheduleSchema),
  rescheduleController
);

// Update destinasi reschedule yang sudah ada (ubah newVisitDate di history) — tidak membuat entri baru
router.patch(
  "/:id/reschedule/:historyId",
  authenticate,
  authorize(...WRITE_ROLES),
  validate(rescheduleSchema),
  updateRescheduleController
);

module.exports = router;
