const { Router }    = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const upload        = require("../../middlewares/upload.middleware");
const authorize     = require("../../middlewares/role.middleware");
const { ROLES }     = require("../../common/constants/role.constant");
const { listController, uploadController, deleteController } = require("./appointmentPhoto.controller");

const router = Router({ mergeParams: true });

// Unggah/hapus foto — peran yang boleh membuat booking (foto ikut diunggah saat buat booking) (G1-11)
// OFFICE & STAFF_OPERASIONAL view-only di menu Booking / Booking Harian
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];
// Baca — sama dengan GET /appointments (INVENTORY tidak punya menu booking)
const READ_ROLES  = [...WRITE_ROLES, ROLES.STAFF_OPERASIONAL, ROLES.OFFICE, ROLES.FINANCE];

router.get("/",              authenticate, authorize(...READ_ROLES), listController);
router.post("/",             authenticate, authorize(...WRITE_ROLES), upload.single("photo"), uploadController);
router.delete("/:photoId",   authenticate, authorize(...WRITE_ROLES), deleteController);

module.exports = router;
