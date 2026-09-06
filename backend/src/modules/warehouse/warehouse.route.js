const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  getAllController, getByIdController,
  syncController,
  updateBranchMappingController, removeBranchMappingController, updateMappingController,
  deleteController,
} = require("./warehouse.controller");
const { updateBranchMappingSchema, updateAccurateMappingSchema } = require("./warehouse.validation");

const router = Router();

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER];

// Static routes before /:id to prevent "sync" being captured as id param
router.post("/sync/accurate", authenticate, authorize(...ADMIN_ROLES), syncController);

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

// Admin mapping routes
router.delete("/:id",               authenticate, authorize(...ADMIN_ROLES), deleteController);
router.put("/:id/branch",           authenticate, authorize(...ADMIN_ROLES), validate(updateBranchMappingSchema),   updateBranchMappingController);
router.delete("/:id/branch",        authenticate, authorize(...ADMIN_ROLES), removeBranchMappingController);
router.put("/:id/accurate-mapping", authenticate, authorize(...ADMIN_ROLES), validate(updateAccurateMappingSchema), updateMappingController);

module.exports = router;
