const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createPermissionSchema, reviewPermissionSchema } = require("./permission.validation");
const {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
} = require("./permission.controller");

const router = Router();

// OFFICE punya approval izin sesuai access matrix
const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE];

// Admin: all
router.get("/",    authenticate, authorize(...MANAGER_ROLES), getAllController);
// Self: own permissions
router.get("/my",  authenticate, getMyController);
// Single
router.get("/:id", authenticate, getByIdController);
// Create (any employee)
router.post("/", authenticate, validate(createPermissionSchema), createController);
// Approve / Reject (managers)
router.post("/:id/approve", authenticate, authorize(...MANAGER_ROLES), validate(reviewPermissionSchema), approveController);
router.post("/:id/reject",  authenticate, authorize(...MANAGER_ROLES), validate(reviewPermissionSchema), rejectController);
// Cancel own pending
router.delete("/:id", authenticate, cancelController);

module.exports = router;
