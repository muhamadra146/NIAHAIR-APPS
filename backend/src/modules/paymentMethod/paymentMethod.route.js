const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createPaymentMethodSchema, updatePaymentMethodSchema } = require("./paymentMethod.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./paymentMethod.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

router.post(
  "/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(createPaymentMethodSchema),
  createController
);

router.patch(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(updatePaymentMethodSchema),
  updateController
);

module.exports = router;
