const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }   = require("../../common/constants/role.constant");
const { createComplaintSchema, updateComplaintSchema } = require("./complaint.validation");
const { getStatsController, getAllController, getByIdController, createController, updateController, deleteController } = require("./complaint.controller");

// Sesuai access matrix:
//   Baca   : POS + OFFICE + FINANCE
//   Tulis  : POS saja (OFFICE & FINANCE view-only)
const READ_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.OFFICE, ROLES.FINANCE];
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];

const router = Router();

router.get("/stats", authenticate, authorize(...READ_ROLES), getStatsController);
router.get("/",      authenticate, authorize(...READ_ROLES), getAllController);
router.get("/:id",   authenticate, authorize(...READ_ROLES), getByIdController);
router.post("/",     authenticate, authorize(...WRITE_ROLES), validate(createComplaintSchema), createController);
router.patch("/:id", authenticate, authorize(...WRITE_ROLES), validate(updateComplaintSchema), updateController);
router.delete("/:id", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER), deleteController);

module.exports = router;
