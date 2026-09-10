const { Router }    = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }     = require("../../common/constants/role.constant");
const { createOpnameSchema, updateItemsSchema } = require("./stockOpname.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateItemsController,
  postController,
  cancelController,
} = require("./stockOpname.controller");

const router = Router();

// Read — MANAGEMENT + INVENTORY + FINANCE
const READ_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER,
  ROLES.INVENTORY,   ROLES.FINANCE,
];

// Write — MANAGEMENT only (SUPER_ADMIN, OWNER, MANAGER)
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER];

router.get("/",    authenticate, authorize(...READ_ROLES), getAllController);
router.get("/:id", authenticate, authorize(...READ_ROLES), getByIdController);

router.post(
  "/",
  authenticate,
  authorize(...WRITE_ROLES),
  validate(createOpnameSchema),
  createController,
);

router.patch(
  "/:id/items",
  authenticate,
  authorize(...WRITE_ROLES, ROLES.INVENTORY),  // INVENTORY bisa input qty
  validate(updateItemsSchema),
  updateItemsController,
);

router.post(
  "/:id/post",
  authenticate,
  authorize(...WRITE_ROLES),                   // hanya MANAGEMENT yang bisa posting
  postController,
);

router.post(
  "/:id/cancel",
  authenticate,
  authorize(...WRITE_ROLES),
  cancelController,
);

module.exports = router;
