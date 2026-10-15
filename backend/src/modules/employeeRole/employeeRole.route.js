const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const authorize = require("../../middlewares/role.middleware");
const { ROLES } = require("../../common/constants/role.constant");
const { createEmployeeRoleSchema, updateEmployeeRoleSchema } = require("./employeeRole.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  deleteController,
} = require("./employeeRole.controller");

const router = Router();

router.get("/", authenticate, getAllController);
// Jabatan karyawan — hanya dari Pengaturan (SA/Owner)
router.post("/", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), validate(createEmployeeRoleSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), validate(updateEmployeeRoleSchema), updateController);
router.delete("/:id", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), deleteController);

module.exports = router;
