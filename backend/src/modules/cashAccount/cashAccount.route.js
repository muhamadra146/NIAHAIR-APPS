const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createCashAccountSchema, updateCashAccountSchema } = require("./cashAccount.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  deleteController,
  syncController,
} = require("./cashAccount.controller");

const router = Router();

// Accurate sync — declared before /:id to avoid route shadowing
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncController);

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

router.post(
  "/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  validate(createCashAccountSchema),
  createController
);

router.put(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  validate(updateCashAccountSchema),
  updateController
);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  deleteController
);

module.exports = router;
