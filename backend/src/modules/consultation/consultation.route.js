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
// Baca: role yang punya menu Catatan Klien / Pelanggan / Input Pekerjaan (INVENTORY tidak)
const READ_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.STAFF_OPERASIONAL, ROLES.OFFICE, ROLES.FINANCE];
// Tulis: FINANCE & OFFICE view-only (keputusan owner 2026-10-17). Service memeriksa lebih lanjut:
// staf hanya untuk invoice yang ia tangani; ubah/hapus hanya penulis atau SA/Owner/Manager.
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.STAFF_OPERASIONAL];

// Stats — manajemen saja
router.get("/stats",             authenticate, authorize(...MANAGER_ROLES), getStatsController);
// Unfilled invoices (Tab "Isi Catatan") — HARUS sebelum /:id agar tidak salah match
router.get("/unfilled-invoices", authenticate, authorize(...READ_ROLES), getUnfilledInvoicesController);
router.get("/",                  authenticate, authorize(...READ_ROLES), getAllController);

// By invoice (dipakai staf untuk membuka form miliknya)
router.get("/invoice/:invoiceId", authenticate, authorize(...READ_ROLES), getByInvoiceController);

// Single note
router.get("/:id",    authenticate, authorize(...READ_ROLES), getByIdController);

// Create, update, delete
router.post("/",       authenticate, authorize(...WRITE_ROLES), validate(createNoteSchema), createController);
// Photo upload: WAJIB sebelum PATCH /:id agar Express tidak salah match "photos" sebagai :id
router.patch("/:id/photos", authenticate, authorize(...WRITE_ROLES), uploadConsultationNote.single("photo"), uploadPhotoController);
router.patch("/:id",   authenticate, authorize(...WRITE_ROLES), validate(updateNoteSchema), updateController);
router.delete("/:id",  authenticate, authorize(...WRITE_ROLES), deleteController);

module.exports = router;
