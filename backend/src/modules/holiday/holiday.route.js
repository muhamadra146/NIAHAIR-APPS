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

const ALL_ADMIN = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE];
// Hari libur dikelola Super Admin, Owner, dan Manager (keputusan owner, QA G3-26)
const HOLIDAY_WRITE = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER];

router.get("/",    authenticate, authorize(...ALL_ADMIN), getAllController);
router.get("/:id", authenticate, authorize(...ALL_ADMIN), getByIdController);
router.post("/",   authenticate, authorize(...HOLIDAY_WRITE), validate(createHolidaySchema), createController);
router.put("/:id", authenticate, authorize(...HOLIDAY_WRITE), validate(updateHolidaySchema), updateController);
router.delete("/:id", authenticate, authorize(...HOLIDAY_WRITE), deleteController);

module.exports = router;
