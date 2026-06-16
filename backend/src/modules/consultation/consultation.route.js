const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createNoteSchema, updateNoteSchema } = require("./consultation.validation");
const {
  getAllController,
  getByIdController,
  getByInvoiceController,
  createController,
  updateController,
  deleteController,
  getStatsController,
} = require("./consultation.controller");

const router = Router();

const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER];

// Stats — management only; list — any authenticated (service enforces ownership for non-managers)
router.get("/stats",            authenticate, authorize(...MANAGER_ROLES), getStatsController);
router.get("/",                 authenticate, getAllController);

// By invoice — any authenticated user (used by stylist to fetch their form)
router.get("/invoice/:invoiceId", authenticate, getByInvoiceController);

// Single note
router.get("/:id",    authenticate, getByIdController);

// Create, update, delete — any authenticated (service handles ownership check)
router.post("/",       authenticate, validate(createNoteSchema), createController);
router.patch("/:id",   authenticate, validate(updateNoteSchema), updateController);
router.delete("/:id",  authenticate, deleteController);

module.exports = router;
