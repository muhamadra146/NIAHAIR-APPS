const { Router }  = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }   = require("../../common/constants/role.constant");
const { createSalarySchema, updateSalarySchema } = require("./salary.validation");

// Setting Gaji (lihat & ubah): SUPER_ADMIN, OWNER, FINANCE — MANAGER tidak boleh melihat gaji karyawan
const SALARY_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];
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
  authorize(...SALARY_ROLES),
  getByEmployeeController,
);

// GET /salary-settings/employee/:employeeId/active — current active setting
router.get("/employee/:employeeId/active",
  authenticate,
  authorize(...SALARY_ROLES),
  getActiveController,
);

// GET /salary-settings/:id
router.get("/:id",
  authenticate,
  authorize(...SALARY_ROLES),
  getByIdController,
);

// POST /salary-settings
router.post("/",
  authenticate,
  authorize(...SALARY_ROLES),
  validate(createSalarySchema),
  createController,
);

// PUT /salary-settings/:id
router.put("/:id",
  authenticate,
  authorize(...SALARY_ROLES),
  validate(updateSalarySchema),
  updateController,
);

module.exports = router;
