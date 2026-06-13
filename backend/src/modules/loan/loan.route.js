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
} = require("./loan.controller");

const router = Router();

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN];

router.get("/",
  authenticate, authorize(...ADMIN_ROLES), getAllController,
);

router.get("/employee/:employeeId",
  authenticate, authorize(...ADMIN_ROLES), getByEmployeeController,
);

router.get("/:id",
  authenticate, authorize(...ADMIN_ROLES), getByIdController,
);

router.post("/",
  authenticate, authorize(...ADMIN_ROLES), validate(createLoanSchema), createController,
);

router.put("/:id",
  authenticate, authorize(...ADMIN_ROLES), validate(updateLoanSchema), updateController,
);

router.post("/:id/cancel",
  authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER), cancelController,
);

router.post("/:id/repayments",
  authenticate, authorize(...ADMIN_ROLES), validate(addRepaymentSchema), addRepaymentController,
);

router.get("/:id/repayments",
  authenticate, authorize(...ADMIN_ROLES), getRepaymentsController,
);

module.exports = router;
