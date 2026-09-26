const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createSchema, updateSchema } = require("./omsetBonusTier.validation");
const {
  getByEmployeeController,
  createController,
  updateController,
  deleteController,
} = require("./omsetBonusTier.controller");

const router = Router({ mergeParams: true }); // mergeParams agar :employeeId tersedia

const ADMIN = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];

// GET    /employees/:employeeId/omset-bonus-tiers
router.get("/",    authenticate, authorize(...ADMIN), getByEmployeeController);

// POST   /employees/:employeeId/omset-bonus-tiers
router.post("/",   authenticate, authorize(...ADMIN), validate(createSchema), createController);

// PUT    /omset-bonus-tiers/:id  (standalone router untuk update & delete)
// DELETE /omset-bonus-tiers/:id
module.exports = router;

// ── Standalone router (untuk PUT/DELETE by tier id) ──────────────────────────
const standaloneRouter = Router();
standaloneRouter.put("/:id",    authenticate, authorize(...ADMIN), validate(updateSchema), updateController);
standaloneRouter.delete("/:id", authenticate, authorize(...ADMIN), deleteController);

module.exports.standaloneRouter = standaloneRouter;
