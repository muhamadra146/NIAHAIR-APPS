const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  closePeriodSchema,
  reopenPeriodSchema,
  stockAdjustmentSchema,
  batchStockAdjustmentSchema,
  openingBalanceSchema,
  updateMinStockSchema,
} = require("./inventory.validation");
const {
  getMovementsController,
  getInventoriesController,
  syncController,
  generateServiceMovementController,
  createAdjustmentController,
  createBatchAdjustmentController,
  closePeriodController,
  reopenPeriodController,
  getPeriodsController,
  createOpeningBalanceController,
  updateMinStockController,
  getLowStockController,
  getValuationController,
} = require("./inventory.controller");

const router = Router();

// Accurate sync — SUPER_ADMIN only, declared before /:id-style routes
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncController);

// Period management — SUPER_ADMIN only
router.get("/periods",          authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), getPeriodsController);
router.post("/periods/close",   authenticate, authorize(ROLES.SUPER_ADMIN), validate(closePeriodSchema),  closePeriodController);
router.post("/periods/reopen",  authenticate, authorize(ROLES.SUPER_ADMIN), validate(reopenPeriodSchema), reopenPeriodController);

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

// ── GAP 2: Opening Balance ─────────────────────────────────────────────────
// POST /api/v1/inventory/opening-balance — SUPER_ADMIN + OWNER only
router.post(
  "/opening-balance",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER),
  validate(openingBalanceSchema),
  createOpeningBalanceController,
);

// ── GAP 3: Low Stock & Min Stock ──────────────────────────────────────────
// GET  /api/v1/inventory/low-stock           — semua role inventory/finance
// PUT  /api/v1/inventory/:id/min-stock       — MANAGEMENT + INVENTORY
router.get(
  "/low-stock",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY, ROLES.FINANCE),
  getLowStockController,
);

router.put(
  "/:id/min-stock",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY),
  validate(updateMinStockSchema),
  updateMinStockController,
);

// ── GAP 6: Inventory Valuation ────────────────────────────────────────────
// GET  /api/v1/inventory/valuation           — MANAGEMENT + FINANCE
router.get(
  "/valuation",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE),
  getValuationController,
);

module.exports = router;
