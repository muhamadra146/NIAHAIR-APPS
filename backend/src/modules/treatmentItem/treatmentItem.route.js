const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createItemSchema, updateItemSchema } = require("./treatmentItem.validation");
const {
  getBySessionController,
  createController,
  updateController,
  deleteController,
} = require("./treatmentItem.controller");

// mergeParams: true — inherits :sessionId from the parent treatment router
// when mounted as router.use("/:sessionId/items", treatmentItemRouter).
const router = Router({ mergeParams: true });

// Tulis — sama dengan sesi treatment (POS) (G1-11)
const MUTATE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];

router.get("/",       authenticate, getBySessionController);
router.post("/",      authenticate, authorize(...MUTATE_ROLES), validate(createItemSchema), createController);
router.put("/:id",    authenticate, authorize(...MUTATE_ROLES), validate(updateItemSchema), updateController);
router.delete("/:id", authenticate, authorize(...MUTATE_ROLES), deleteController);

module.exports = router;
