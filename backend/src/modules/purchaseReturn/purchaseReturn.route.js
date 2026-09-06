const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createPurchaseReturnSchema } = require("./purchaseReturn.validation");
const {
  listController,
  getController,
  createController,
  postController,
  cancelController,
  deleteController,
  syncController,
} = require("./purchaseReturn.controller");

const router = Router();

// Who can view purchase returns
const READ_ROLES  = [
  ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER,
  ROLES.INVENTORY, ROLES.FINANCE, ROLES.OFFICE,
];
// Who can create/post purchase returns
const WRITE_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY,
];
// Who can delete (DRAFT only)
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER];

router.get("/",    authenticate, authorize(...READ_ROLES),  listController);
router.get("/:id", authenticate, authorize(...READ_ROLES),  getController);

router.post("/", authenticate, authorize(...WRITE_ROLES), validate(createPurchaseReturnSchema), createController);

router.patch("/:id/post",   authenticate, authorize(...WRITE_ROLES), postController);
router.patch("/:id/cancel", authenticate, authorize(...WRITE_ROLES), cancelController);
router.delete("/:id",       authenticate, authorize(...ADMIN_ROLES), deleteController);

// Manual Accurate sync
router.post("/:id/sync/accurate", authenticate, authorize(...ADMIN_ROLES), syncController);

module.exports = router;
