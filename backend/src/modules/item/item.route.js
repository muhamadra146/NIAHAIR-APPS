const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../common/constants/role.constant");
const { createItemSchema, updateItemSchema } = require("./item.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  getServiceMaterialsController,
} = require("./item.controller");
const { syncFromAccurateController } = require("./item.sync.controller");
const { syncToAccurateController } = require("./item.push.controller");

const router = Router();

// 1. Static routes first — prevents "sync" from being captured as :id
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncFromAccurateController);

// 2. Special parameter routes second
router.post("/:id/sync/accurate",       authenticate, syncToAccurateController);
router.get( "/:id/service-materials",   authenticate, getServiceMaterialsController);

// 3. CRUD routes last
router.get("/", authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/", authenticate, validate(createItemSchema), createController);
router.put("/:id", authenticate, validate(updateItemSchema), updateController);

module.exports = router;
