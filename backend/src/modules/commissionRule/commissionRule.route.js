const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createCommissionRuleSchema, updateCommissionRuleSchema } = require("./commissionRule.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  deleteController,
} = require("./commissionRule.controller");

const router = Router();

// Baca aturan komisi — MANAGEMENT + FINANCE (perlu tahu aturan saat verifikasi)
const VIEW_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE];
// Ubah aturan komisi — ADMIN only
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER];

router.get("/",       authenticate, authorize(...VIEW_ROLES),  getAllController);
router.post("/",      authenticate, authorize(...ADMIN_ROLES), validate(createCommissionRuleSchema), createController);
router.get("/:id",    authenticate, authorize(...VIEW_ROLES),  getByIdController);
router.put("/:id",    authenticate, authorize(...ADMIN_ROLES), validate(updateCommissionRuleSchema), updateController);
router.delete("/:id", authenticate, authorize(...ADMIN_ROLES), deleteController);

module.exports = router;
