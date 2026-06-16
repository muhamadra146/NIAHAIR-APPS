const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
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
router.post("/", authenticate, validate(createEmployeeRoleSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, validate(updateEmployeeRoleSchema), updateController);
router.delete("/:id", authenticate, deleteController);

module.exports = router;
