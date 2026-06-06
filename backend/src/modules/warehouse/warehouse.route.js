const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  getAllController, getByIdController,
  syncController,
  updateBranchMappingController, updateMappingController,
} = require("./warehouse.controller");
const { updateBranchMappingSchema, updateAccurateMappingSchema } = require("./warehouse.validation");

const router = Router();

// Static routes before /:id to prevent "sync" being captured as id param
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncController);

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

// Admin mapping routes
router.put("/:id/branch",           authenticate, authorize(ROLES.SUPER_ADMIN), validate(updateBranchMappingSchema),   updateBranchMappingController);
router.put("/:id/accurate-mapping", authenticate, authorize(ROLES.SUPER_ADMIN), validate(updateAccurateMappingSchema), updateMappingController);

module.exports = router;
