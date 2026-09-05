const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { closePeriodSchema, reopenPeriodSchema, stockAdjustmentSchema, batchStockAdjustmentSchema } = require("./inventory.validation");
const {
  getMovementsController,
  getInventoriesController,
  syncController,
  generateServiceMovementController,
  createAdjustmentController,
  createBatchAdjustmentController,
  closePeriodController,
  reopenPeriodController,
} = require("./inventory.controller");

const router = Router();

// Accurate sync — SUPER_ADMIN only, declared before /:id-style routes
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncController);

// Period management — SUPER_ADMIN only
router.post("/periods/close",  authenticate, authorize(ROLES.SUPER_ADMIN), validate(closePeriodSchema),  closePeriodController);
router.post("/periods/reopen", authenticate, authorize(ROLES.SUPER_ADMIN), validate(reopenPeriodSchema), reopenPeriodController);

router.get("/movements", authenticate, getMovementsController);
router.get("/",          authenticate, getInventoriesController);

router.post(
  "/service-movement/:treatmentSessionId",
  authenticate,
  generateServiceMovementController,
);

// Stock adjustment — MANAGEMENT + INVENTORY + FINANCE
const ADJUST_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY, ROLES.FINANCE];

router.post(
  "/adjust-batch",
  authenticate,
  authorize(...ADJUST_ROLES),
  validate(batchStockAdjustmentSchema),
  createBatchAdjustmentController,
);

router.post(
  "/:id/adjust",
  authenticate,
  authorize(...ADJUST_ROLES),
  validate(stockAdjustmentSchema),
  createAdjustmentController,
);

module.exports = router;
