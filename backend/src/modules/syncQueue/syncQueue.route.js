const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const validate = require("../../middlewares/validate.middleware");
const { createSyncJobSchema } = require("./syncQueue.validation");
const { getAllController, createController, retryController } = require("./syncQueue.controller");

const router = Router();

// All sync queue management is SUPER_ADMIN only
router.get("/",           authenticate, authorize(ROLES.SUPER_ADMIN), getAllController);
router.post("/",          authenticate, authorize(ROLES.SUPER_ADMIN), validate(createSyncJobSchema), createController);
router.post("/:id/retry", authenticate, authorize(ROLES.SUPER_ADMIN), retryController);

module.exports = router;
