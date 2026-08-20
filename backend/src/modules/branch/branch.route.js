const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../common/constants/role.constant");
const { createBranchSchema, updateBranchSchema } = require("./branch.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  deleteController,
  syncFromAccurateController,
  mapToAccurateController,
} = require("./branch.controller");
const router = Router();

// Accurate sync — must be BEFORE /:id routes
router.post("/sync-accurate", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), syncFromAccurateController);
router.put("/:id/accurate-mapping", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), mapToAccurateController);

// CRUD routes
router.get("/", authenticate, getAllController);
router.post("/", authenticate, validate(createBranchSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, validate(updateBranchSchema), updateController);
router.delete("/:id", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), deleteController);

module.exports = router;
