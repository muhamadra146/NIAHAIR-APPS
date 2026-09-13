const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  createProductionSchema, updateStatusSchema, submitQCSchema,
} = require("./production.validation");
const {
  getAllController, getByIdController, getStatsController,
  createController, updateStatusController, submitQCController, deleteController,
  syncController,
} = require("./production.controller");

const router = Router();

// Roles yang bisa mengakses production
const PRODUCTION_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY,
];

// Roles yang bisa membuat / mengubah status
const PRODUCTION_WRITE_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY,
];

// Stats — accessed before /:id to avoid conflict
router.get("/stats", authenticate, authorize(...PRODUCTION_ROLES), getStatsController);

router.get("/",   authenticate, authorize(...PRODUCTION_ROLES), getAllController);
router.post("/",  authenticate, authorize(...PRODUCTION_WRITE_ROLES), validate(createProductionSchema), createController);

router.get("/:id",    authenticate, authorize(...PRODUCTION_ROLES), getByIdController);
router.delete("/:id", authenticate, authorize(...PRODUCTION_WRITE_ROLES), deleteController);

// Status transition
router.patch("/:id/status", authenticate, authorize(...PRODUCTION_WRITE_ROLES), validate(updateStatusSchema), updateStatusController);

// QC submission
router.post("/:id/qc", authenticate, authorize(...PRODUCTION_WRITE_ROLES), validate(submitQCSchema), submitQCController);

// Manual sync ke Accurate — fallback jika auto-sync gagal
router.post("/:id/sync", authenticate, authorize(...PRODUCTION_WRITE_ROLES), syncController);

module.exports = router;
