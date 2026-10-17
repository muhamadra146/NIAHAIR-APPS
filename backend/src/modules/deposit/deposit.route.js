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
  summaryController,
  resyncController,
} = require("./deposit.controller");

// mergeParams: true — inherits :appointmentId when mounted at
// app.use("/appointments/:appointmentId/deposits", router)
const router = Router({ mergeParams: true });

// Hak akses mengikuti menu (sidebarNav): Deposit = POS + OFFICE/FINANCE (lihat saja).
// STAFF_OPERASIONAL ikut baca karena tab DP di Detail Booking (dibuka dari Booking Harian).
// INVENTORY tidak punya menu/layar yang memakai deposit.
const READ_ROLES    = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.OFFICE, ROLES.FINANCE, ROLES.STAFF_OPERASIONAL];
const SUMMARY_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.OFFICE, ROLES.FINANCE];
// Tulis: POS saja — OFFICE & FINANCE view-only (FIN-012)
const WRITE_ROLES   = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];

router.get("/",        authenticate, authorize(...READ_ROLES),    getAllController);
router.get("/summary", authenticate, authorize(...SUMMARY_ROLES), summaryController);
router.get("/:id",     authenticate, authorize(...READ_ROLES),    getByIdController);

router.post("/:id/resync", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER), resyncController);

router.post(
  "/",
  authenticate,
  requireBranch,
  authorize(...WRITE_ROLES),
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
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER),
  validate(linkAppointmentSchema),
  linkAppointmentController
);

router.patch(
  "/:id/refund",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER),
  refundController
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER),
  cancelController
);

module.exports = router;
