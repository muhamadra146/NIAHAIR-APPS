const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const {
  getAllController,
  getByIdController,
  approveController,
  payController,
} = require("./commission.controller");

const router = Router();

// All authenticated users can view commissions
router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

// SUPER_ADMIN only — status transitions
router.patch("/:id/approve", authenticate, authorize("SUPER_ADMIN"), approveController);
router.patch("/:id/pay",     authenticate, authorize("SUPER_ADMIN"), payController);

module.exports = router;
