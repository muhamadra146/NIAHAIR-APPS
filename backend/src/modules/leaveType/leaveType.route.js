const { Router }  = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }   = require("../../common/constants/role.constant");
const { createLeaveTypeSchema, updateLeaveTypeSchema } = require("./leaveType.validation");
const { getAllController, getByIdController, createController, updateController } = require("./leaveType.controller");

const router = Router();
const ADMIN  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

router.get("/",     authenticate, getAllController);
router.get("/:id",  authenticate, getByIdController);
router.post("/",     authenticate, authorize(...ADMIN), validate(createLeaveTypeSchema), createController);
router.patch("/:id", authenticate, authorize(...ADMIN), validate(updateLeaveTypeSchema), updateController);

module.exports = router;
