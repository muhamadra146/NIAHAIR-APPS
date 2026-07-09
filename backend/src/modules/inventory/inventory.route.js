const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { closePeriodSchema, reopenPeriodSchema } = require("./inventory.validation");
const {
  getMovementsController,
  getInventoriesController,
  syncController,
  generateServiceMovementController,
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

module.exports = router;
