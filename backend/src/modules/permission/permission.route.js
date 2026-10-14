const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const requireApprover = require("../../middlewares/approver.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { createPermissionSchema, reviewPermissionSchema } = require("./permission.validation");
const {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
} = require("./permission.controller");

const router = Router();

// OFFICE punya approval izin sesuai access matrix

// Admin: all
router.get("/",    authenticate, requireApprover, getAllController);
// Self: own permissions
router.get("/my",  authenticate, getMyController);
// Single
router.get("/:id", authenticate, getByIdController);
// Create (any employee)
router.post("/", authenticate, validate(createPermissionSchema), createController);
// Approve / Reject (managers)
router.post("/:id/approve", authenticate, requireApprover, validate(reviewPermissionSchema), approveController);
router.post("/:id/reject",  authenticate, requireApprover, validate(reviewPermissionSchema), rejectController);
// Cancel own pending
router.delete("/:id", authenticate, cancelController);

module.exports = router;
