const { Router }        = require("express");
const authenticate       = require("../../middlewares/auth.middleware");
const authorize          = require("../../middlewares/role.middleware");
const validate           = require("../../middlewares/validate.middleware");
const uploadEmployee     = require("../../middlewares/uploadEmployee.middleware");
const { ROLES }         = require("../../common/constants/role.constant");
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeBranchesSchema,
} = require("./employee.validation");
const {
  getNextCodeController,
  getAllController,
  getByIdController,
  createController,
  updateController,
  uploadFilesController,
  updateBranchesController,
  deactivateController,
  deleteController,
} = require("./employee.controller");

const router = Router();

// Tambah/ubah karyawan — peran yang bisa menulis di halaman Karyawan (Finance hanya lihat)
const EMPLOYEE_WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE];

router.get("/next-code", authenticate, getNextCodeController);
router.get("/",          authenticate, getAllController);
router.post("/",   authenticate, authorize(...EMPLOYEE_WRITE_ROLES), uploadEmployee.fields([{ name: "ktpFile", maxCount: 1 }, { name: "contractFile", maxCount: 1 }]), validate(createEmployeeSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, authorize(...EMPLOYEE_WRITE_ROLES), uploadEmployee.fields([{ name: "ktpFile", maxCount: 1 }, { name: "contractFile", maxCount: 1 }]), validate(updateEmployeeSchema), updateController);

router.patch("/:id/files",      authenticate, authorize(...EMPLOYEE_WRITE_ROLES), uploadEmployee.fields([{ name: "ktpFile", maxCount: 1 }, { name: "contractFile", maxCount: 1 }]), uploadFilesController);
router.patch("/:id/deactivate", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), deactivateController);
router.delete("/:id",           authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), deleteController);

// Akses cabang ("Bisa Bekerja Di") diatur Super Admin dan Owner (EMP-005, keputusan user 2026-10-19)
const BRANCH_ACCESS_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER];

// Must be declared after GET /:id — different method (PATCH), no conflict
router.patch(
  "/:id/branches",
  authenticate,
  authorize(...BRANCH_ACCESS_ROLES),
  validate(updateEmployeeBranchesSchema),
  updateBranchesController
);

module.exports = router;
