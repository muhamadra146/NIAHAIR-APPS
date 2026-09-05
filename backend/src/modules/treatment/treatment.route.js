const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createSessionSchema, updateSessionSchema } = require("./treatment.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./treatment.controller");
const treatmentItemRouter   = require("../treatmentItem/treatmentItem.route");
const materialUsageRouter   = require("../materialUsage/materialUsage.route");
const { getController: getJobAssignmentsController, upsertController: upsertJobAssignmentsController } = require("./treatmentJobAssignment.controller");

const router = Router();

const MUTATE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/",   authenticate, authorize(...MUTATE_ROLES), validate(createSessionSchema), createController);
router.put("/:id", authenticate, authorize(...MUTATE_ROLES), validate(updateSessionSchema), updateController);

// Job assignments — dikerjakan oleh siapa per job slot
router.get("/:id/job-assignments",  authenticate, getJobAssignmentsController);
router.put("/:id/job-assignments",  authenticate, authorize(...MUTATE_ROLES), upsertJobAssignmentsController);

// Nested items resource — :sessionId is forwarded via mergeParams in the item router
router.use("/:sessionId/items",            treatmentItemRouter);
router.use("/:sessionId/material-usages",  materialUsageRouter);

module.exports = router;
