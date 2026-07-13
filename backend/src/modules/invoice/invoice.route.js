const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const requireBranch = require("../../middlewares/branch.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createInvoiceSchema, applyDepositSchema, updateInvoiceSchema } = require("./invoice.validation");
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
} = require("./invoice.controller");

const MANAGER_ROLES        = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER];
const DAILY_ASSIGN_ROLES   = [...MANAGER_ROLES, ROLES.STAFF, ROLES.THERAPIST];

const router = Router();

router.get("/",                 authenticate, getAllController);
// Literal-path routes MUST come before /:id — Express matches first-registered-wins
router.get("/daily-assignment",        authenticate, authorize(...DAILY_ASSIGN_ROLES), dailyAssignmentController);
router.get("/commission-generate",     authenticate, authorize(...MANAGER_ROLES), commissionGenerateListController);
router.get("/:id",              authenticate, getByIdController);
router.post("/",   authenticate, requireBranch, validate(createInvoiceSchema), createController);
router.patch("/:id", authenticate, validate(updateInvoiceSchema), updateController);
router.post("/:invoiceId/deposits", authenticate, validate(applyDepositSchema), applyDepositController);
router.patch("/:id/cancel",             authenticate, cancelController);
router.delete("/:id",                   authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER), deleteController);
router.post("/:id/setup-treatment",     authenticate, setupTreatmentController);
router.post("/:id/generate-commission", authenticate, generateCommissionController);
router.post("/:id/skip-commission",     authenticate, authorize(...MANAGER_ROLES), skipCommissionController);
router.post("/:id/reset-commission-skip", authenticate, authorize(...MANAGER_ROLES), resetCommissionSkipController);

module.exports = router;
