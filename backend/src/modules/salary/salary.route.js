const { Router }  = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }   = require("../../common/constants/role.constant");
const { createSalarySchema, updateSalarySchema } = require("./salary.validation");
const {
  getByEmployeeController,
  getActiveController,
  getByIdController,
  createController,
  updateController,
} = require("./salary.controller");

const router = Router();

// GET /salary-settings/employee/:employeeId        — all history for employee
router.get("/employee/:employeeId",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  getByEmployeeController,
);

// GET /salary-settings/employee/:employeeId/active — current active setting
router.get("/employee/:employeeId/active",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  getActiveController,
);

// GET /salary-settings/:id
router.get("/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  getByIdController,
);

// POST /salary-settings
router.post("/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(createSalarySchema),
  createController,
);

// PUT /salary-settings/:id
router.put("/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(updateSalarySchema),
  updateController,
);

module.exports = router;
