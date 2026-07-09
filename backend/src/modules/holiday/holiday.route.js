const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createHolidaySchema, updateHolidaySchema } = require("./holiday.validation");
const {
  getAllController, getByIdController,
  createController, updateController, deleteController,
} = require("./holiday.controller");

const router = Router();

const ALL_ADMIN = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN];

router.get("/",    authenticate, authorize(...ALL_ADMIN), getAllController);
router.get("/:id", authenticate, authorize(...ALL_ADMIN), getByIdController);
router.post("/",   authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER), validate(createHolidaySchema), createController);
router.put("/:id", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER), validate(updateHolidaySchema), updateController);
router.delete("/:id", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER), deleteController);

module.exports = router;
