const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const {
  getAllController,
  getByIdController,
  approveController,
  payController,
  regenerateController,
  overrideController,
  deleteController,
} = require("./commission.controller");

const router = Router();

// All authenticated users can view commissions
router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

// SUPER_ADMIN only — status transitions, regenerate & override
router.patch("/:id/approve",             authenticate, authorize("SUPER_ADMIN"), approveController);
router.patch("/:id/pay",                 authenticate, authorize("SUPER_ADMIN"), payController);
router.patch("/:id/override",            authenticate, authorize("SUPER_ADMIN"), overrideController);
// Regenerate semua komisi untuk satu invoice (hapus PENDING lama, buat ulang)
router.post("/invoice/:invoiceId/regenerate", authenticate, authorize("SUPER_ADMIN"), regenerateController);

// Delete — hanya PENDING yang bisa dihapus
router.delete("/:id", authenticate, authorize("SUPER_ADMIN"), deleteController);

module.exports = router;
