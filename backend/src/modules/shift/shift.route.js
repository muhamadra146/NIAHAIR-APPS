const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createShiftSchema, updateShiftSchema } = require("./shift.validation");
const { getAllController, getByIdController, createController, updateController } = require("./shift.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

router.post("/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(createShiftSchema),
  createController,
);

router.put("/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(updateShiftSchema),
  updateController,
);

module.exports = router;
