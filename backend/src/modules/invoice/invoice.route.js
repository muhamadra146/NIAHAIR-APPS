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
} = require("./invoice.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/",   authenticate, requireBranch, validate(createInvoiceSchema), createController);
router.patch("/:id", authenticate, validate(updateInvoiceSchema), updateController);
router.post("/:invoiceId/deposits", authenticate, validate(applyDepositSchema), applyDepositController);
router.patch("/:id/cancel",             authenticate, cancelController);
router.delete("/:id",                   authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER), deleteController);
router.post("/:id/setup-treatment",     authenticate, setupTreatmentController);
router.post("/:id/generate-commission", authenticate, generateCommissionController);

module.exports = router;
