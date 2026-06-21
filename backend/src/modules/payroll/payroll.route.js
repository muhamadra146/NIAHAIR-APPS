const { Router }  = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }   = require("../../common/constants/role.constant");
const { generateSchema, updateNotesSchema } = require("./payroll.validation");
const {
  getAllController, getByIdController, generateController, recalculateController,
  submitController, approveController, markAsPaidController, updateNotesController,
  getMyController, getBpjsReportController, deleteController,
} = require("./payroll.controller");

const router = Router();

const ALL_ADMIN = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN];
const APPROVERS = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

// Employee self-service — must be BEFORE /:id
router.get("/my",          authenticate, getMyController);
router.get("/bpjs-report", authenticate, authorize(...ALL_ADMIN), getBpjsReportController);

router.get("/",    authenticate, authorize(...ALL_ADMIN), getAllController);
router.get("/:id", authenticate, authorize(...ALL_ADMIN), getByIdController);

router.post("/generate",
  authenticate, authorize(...ALL_ADMIN), validate(generateSchema), generateController,
);

router.post("/:id/recalculate",
  authenticate, authorize(...ALL_ADMIN), recalculateController,
);

router.post("/:id/submit",
  authenticate, authorize(...ALL_ADMIN), submitController,
);

router.post("/:id/approve",
  authenticate, authorize(...APPROVERS), approveController,
);

router.post("/:id/mark-paid",
  authenticate, authorize(...APPROVERS), markAsPaidController,
);

router.patch("/:id/notes",
  authenticate, authorize(...ALL_ADMIN), validate(updateNotesSchema), updateNotesController,
);

router.delete("/:id",
  authenticate, authorize(...APPROVERS), deleteController,
);

module.exports = router;
