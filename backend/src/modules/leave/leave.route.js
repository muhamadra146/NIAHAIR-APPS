const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const authorize     = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createLeaveSchema } = require("./leave.validation");
const {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
} = require("./leave.controller");

const router = Router();

const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

// Admin: all leaves
router.get("/",    authenticate, authorize(...MANAGER_ROLES), getAllController);

// Self: my leaves (before /:id to avoid conflict)
router.get("/my",  authenticate, getMyController);

// Single
router.get("/:id", authenticate, getByIdController);

// Create request (any authenticated user with employeeId)
router.post("/", authenticate, validate(createLeaveSchema), createController);

// Approve / Reject (managers)
router.post("/:id/approve", authenticate, authorize(...MANAGER_ROLES), approveController);
router.post("/:id/reject",  authenticate, authorize(...MANAGER_ROLES), rejectController);

// Cancel own pending leave
router.delete("/:id", authenticate, cancelController);

module.exports = router;
