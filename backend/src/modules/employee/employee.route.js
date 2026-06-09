const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeBranchesSchema,
} = require("./employee.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
  updateBranchesController,
} = require("./employee.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.post("/",   authenticate, validate(createEmployeeSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, validate(updateEmployeeSchema), updateController);

// Must be declared after GET /:id — different method (PATCH), no conflict
router.patch(
  "/:id/branches",
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  validate(updateEmployeeBranchesSchema),
  updateBranchesController
);

module.exports = router;
