const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createNoteSchema, updateNoteSchema } = require("./consultation.validation");
const uploadConsultationNote = require("../../middlewares/uploadConsultationNote.middleware");
const {
  getAllController,
  getUnfilledInvoicesController,
  getByIdController,
  getByInvoiceController,
  createController,
  updateController,
  uploadPhotoController,
  deleteController,
  getStatsController,
} = require("./consultation.controller");

const router = Router();

const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE];

// Stats — management only; list — any authenticated (service enforces ownership for non-managers)
router.get("/stats",             authenticate, authorize(...MANAGER_ROLES), getStatsController);
// Unfilled invoices (Tab "Isi Catatan") — HARUS sebelum /:id agar tidak salah match
router.get("/unfilled-invoices", authenticate, getUnfilledInvoicesController);
router.get("/",                  authenticate, getAllController);

// By invoice — any authenticated user (used by stylist to fetch their form)
router.get("/invoice/:invoiceId", authenticate, getByInvoiceController);

// Single note
router.get("/:id",    authenticate, getByIdController);

// Create, update, delete — any authenticated (service handles ownership check)
router.post("/",       authenticate, validate(createNoteSchema), createController);
// Photo upload: WAJIB sebelum PATCH /:id agar Express tidak salah match "photos" sebagai :id
router.patch("/:id/photos", authenticate, uploadConsultationNote.single("photo"), uploadPhotoController);
router.patch("/:id",   authenticate, validate(updateNoteSchema), updateController);
router.delete("/:id",  authenticate, deleteController);

module.exports = router;
