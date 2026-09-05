const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
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

// MANAGER hanya view; FINANCE + OWNER full access
const VIEW_ROLES    = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE];
const FINANCE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];

// View
router.get("/",    authenticate, authorize(...VIEW_ROLES), getAllController);
router.get("/:id", authenticate, authorize(...VIEW_ROLES), getByIdController);

// Mutations — FINANCE full access
router.patch("/:id/approve",
  authenticate, authorize(...FINANCE_ROLES), approveController);
router.patch("/:id/pay",
  authenticate, authorize(...FINANCE_ROLES), payController);
router.patch("/:id/override",
  authenticate, authorize(...FINANCE_ROLES), overrideController);
// Regenerate semua komisi untuk satu invoice (hapus PENDING lama, buat ulang)
router.post("/invoice/:invoiceId/regenerate",
  authenticate, authorize(...FINANCE_ROLES), regenerateController);

// Delete — hanya PENDING yang bisa dihapus
router.delete("/:id", authenticate, authorize(...FINANCE_ROLES), deleteController);

module.exports = router;
