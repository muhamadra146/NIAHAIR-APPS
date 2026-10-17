const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const requireBranch = require("../../middlewares/branch.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  createInvoiceSchema, applyDepositSchema, updateInvoiceSchema,
  calculateCommissionSchema, finalizeCommissionSchema,
} = require("./invoice.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  applyDepositController,
  cancelController,
  deleteController,
  setupTreatmentController,
  generateCommissionController,
  dailyAssignmentController,
  commissionGenerateListController,
  skipCommissionController,
  resetCommissionSkipController,
  jobAssignmentsController,
  submitJobAssignmentsController,
  commissionWorksheetController,
  calculateCommissionController,
  finalizeCommissionController,
} = require("./invoice.controller");

const MANAGER_ROLES        = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER];
const POS_ROLES            = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];
const DAILY_ASSIGN_ROLES   = [...MANAGER_ROLES, ROLES.STAFF_OPERASIONAL];
// Generate komisi & list: ADMIN + FINANCE (sesuai access matrix — MANAGER tidak punya akses)
const KOMISI_GEN_ROLES     = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];
// Kalkulator komisi (lihat, hitung, simpan): SUPER_ADMIN, OWNER, FINANCE (sama dengan generate/regenerate).
// Staf hanya mengisi pengerjaan (job-assignments), tidak boleh menghitung komisi sendiri.
const COMMISSION_CALC_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];
// Baca invoice (R2a): POS + FINANCE (lihat saja) + peran yang membaca invoice dari layar lain —
// OFFICE (tab Invoice di detail Booking, Komplain, Catatan Klien) dan STAFF_OPERASIONAL
// (tab Invoice di detail Booking read-only, form Catatan Klien). INVENTORY tidak punya akses.
const INVOICE_READ_ROLES   = [...POS_ROLES, ROLES.FINANCE, ROLES.OFFICE, ROLES.STAFF_OPERASIONAL];

const router = Router();

router.get("/",                 authenticate, authorize(...INVOICE_READ_ROLES), getAllController);
// Literal-path routes MUST come before /:id — Express matches first-registered-wins
router.get("/daily-assignment",        authenticate, authorize(...DAILY_ASSIGN_ROLES), dailyAssignmentController);
router.get("/commission-generate",     authenticate, authorize(...KOMISI_GEN_ROLES), commissionGenerateListController);
// Baca daftar pengerjaan: + FINANCE (melihat invoice "Siap Kalkulasi"); menyimpan tetap DAILY_ASSIGN_ROLES
router.get("/job-assignments",         authenticate, authorize(...DAILY_ASSIGN_ROLES, ROLES.FINANCE), jobAssignmentsController);
router.get("/:id",              authenticate, authorize(...INVOICE_READ_ROLES), getByIdController);
router.post("/",   authenticate, requireBranch, authorize(...POS_ROLES), validate(createInvoiceSchema), createController);
// Ubah / batal / pasang DP / setup treatment — hanya peran yang memakai halaman Invoice (POS)
router.patch("/:id", authenticate, authorize(...POS_ROLES), validate(updateInvoiceSchema), updateController);
router.post("/:invoiceId/deposits", authenticate, authorize(...POS_ROLES), validate(applyDepositSchema), applyDepositController);
router.patch("/:id/cancel",             authenticate, authorize(...POS_ROLES), cancelController);
router.delete("/:id",                   authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER), deleteController);
router.post("/:id/setup-treatment",     authenticate, authorize(...POS_ROLES), setupTreatmentController);
router.post("/:id/generate-commission",      authenticate, authorize(...KOMISI_GEN_ROLES), generateCommissionController);
router.post("/:id/submit-job-assignments",   authenticate, authorize(...DAILY_ASSIGN_ROLES), submitJobAssignmentsController);
router.get( "/:id/commission-worksheet",     authenticate, authorize(...COMMISSION_CALC_ROLES), commissionWorksheetController);
router.post("/:id/commission-worksheet/calculate", authenticate, authorize(...COMMISSION_CALC_ROLES), validate(calculateCommissionSchema), calculateCommissionController);
router.post("/:id/finalize-commission",      authenticate, authorize(...COMMISSION_CALC_ROLES), validate(finalizeCommissionSchema), finalizeCommissionController);
router.post("/:id/skip-commission",     authenticate, authorize(...MANAGER_ROLES), skipCommissionController);
router.post("/:id/reset-commission-skip", authenticate, authorize(...MANAGER_ROLES), resetCommissionSkipController);

module.exports = router;
