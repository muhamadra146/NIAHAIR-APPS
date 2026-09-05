const { Router }  = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }   = require("../../common/constants/role.constant");
const { createLoanSchema, updateLoanSchema, addRepaymentSchema } = require("./loan.validation");
const {
  getAllController, getByEmployeeController, getByIdController,
  createController, updateController, cancelController,
  addRepaymentController, getRepaymentsController,
  getMyLoansController, getMyLoanByIdController,
  deleteController,
} = require("./loan.controller");

const router = Router();

// MANAGER hanya view; FINANCE + OWNER full access
const VIEW_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE];
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];

// ── Self-service (must be before /:id to avoid route conflict) ────────────────
router.get("/my",
  authenticate, getMyLoansController,
);
router.get("/my/:id",
  authenticate, getMyLoanByIdController,
);

// View — MANAGER bisa lihat
router.get("/",
  authenticate, authorize(...VIEW_ROLES), getAllController,
);
router.get("/employee/:employeeId",
  authenticate, authorize(...VIEW_ROLES), getByEmployeeController,
);
router.get("/:id",
  authenticate, authorize(...VIEW_ROLES), getByIdController,
);
router.get("/:id/repayments",
  authenticate, authorize(...VIEW_ROLES), getRepaymentsController,
);

// Write — hanya FINANCE + OWNER (MANAGER tidak bisa buat/edit kasbon)
router.post("/",
  authenticate, authorize(...WRITE_ROLES), validate(createLoanSchema), createController,
);
router.put("/:id",
  authenticate, authorize(...WRITE_ROLES), validate(updateLoanSchema), updateController,
);
router.post("/:id/cancel",
  authenticate, authorize(...WRITE_ROLES), cancelController,
);
router.post("/:id/repayments",
  authenticate, authorize(...WRITE_ROLES), validate(addRepaymentSchema), addRepaymentController,
);

// Delete — SUPER_ADMIN / OWNER only
router.delete("/:id",
  authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), deleteController,
);

module.exports = router;
