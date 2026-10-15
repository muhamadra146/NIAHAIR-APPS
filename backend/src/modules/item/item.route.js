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
  debugAccurateItemController,
} = require("./item.controller");
const { syncFromAccurateController } = require("./item.sync.controller");
const { syncToAccurateController } = require("./item.push.controller");

const router = Router();

// 1. Static routes first — prevents "sync" from being captured as :id
router.post("/sync/accurate",          authenticate, authorize(ROLES.SUPER_ADMIN), syncFromAccurateController);
router.get( "/debug/accurate-detail",  authenticate, authorize(ROLES.SUPER_ADMIN), debugAccurateItemController);

// 2. Special parameter routes second
// Push item ke Accurate — hanya peran pengelola master item (G4-11)
router.post("/:id/sync/accurate",       authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY), syncToAccurateController);
router.get( "/:id/service-materials",   authenticate, getServiceMaterialsController);

// 3. CRUD routes last
router.get("/", authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
// Item baru biasanya dari sinkron Accurate; buat manual hanya SA/Owner
router.post("/", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), validate(createItemSchema), createController);
// Ubah item (kategori komisi, tanda diskon member) — sama dengan akses halaman Komisi → Master Item
const ITEM_EDIT_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE];
router.put("/:id", authenticate, authorize(...ITEM_EDIT_ROLES), validate(updateItemSchema), updateController);

module.exports = router;
