const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { getAllController, getByIdController, createController, updateController, deactivateController } = require("./userRole.controller");
const { createUserRoleSchema, updateUserRoleSchema } = require("./userRole.validation");

const router = Router();

// List + detail: any authenticated user (frontend dropdown)
router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

// Mutations: SUPER_ADMIN only
router.post("/",    authenticate, authorize(ROLES.SUPER_ADMIN), validate(createUserRoleSchema), createController);
router.put("/:id",  authenticate, authorize(ROLES.SUPER_ADMIN), validate(updateUserRoleSchema), updateController);
router.delete("/:id", authenticate, authorize(ROLES.SUPER_ADMIN), deactivateController);

module.exports = router;
