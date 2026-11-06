const { Router }  = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }   = require("../../common/constants/role.constant");
const { generateSchema, bulkGenerateSchema, updateNotesSchema, createManualItemSchema, updateManualItemSchema, validateBody } = require("./payroll.validation");
const {
  getAllController, getByIdController, generateController, bulkGenerateController, previewPeriodController,
  recalculateController, submitController, revertToDraftController, approveController, markAsPaidController, retrySyncController,
  updateNotesController, getMyController, getBpjsReportController, getIncomeRecapController,
  getPph21MonthlyController, getPph21AnnualController, deleteController,
  addManualItemController, updateManualItemController, deleteManualItemController,
} = require("./payroll.controller");

const router = Router();

// Payroll: MANAGER tidak punya akses, hanya OWNER dan FINANCE
const ALL_ADMIN = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];
const APPROVERS = [ROLES.SUPER_ADMIN, ROLES.OWNER];

// Employee self-service — must be BEFORE /:id
router.get("/my",          authenticate, getMyController);
router.get("/bpjs-report", authenticate, authorize(...ALL_ADMIN), getBpjsReportController);
router.get("/income-recap", authenticate, authorize(...ALL_ADMIN), getIncomeRecapController);
router.get("/pph21-report/monthly", authenticate, authorize(...ALL_ADMIN), getPph21MonthlyController);
router.get("/pph21-report/annual",  authenticate, authorize(...ALL_ADMIN), getPph21AnnualController);
router.get("/period-preview", authenticate, authorize(...ALL_ADMIN), previewPeriodController);

router.get("/",    authenticate, authorize(...ALL_ADMIN), getAllController);
router.get("/:id", authenticate, authorize(...ALL_ADMIN), getByIdController);

router.post("/generate",
  authenticate, authorize(...ALL_ADMIN), validateBody(generateSchema), generateController,
);

router.post("/bulk-generate",
  authenticate, authorize(...ALL_ADMIN), validateBody(bulkGenerateSchema), bulkGenerateController,
);

router.post("/:id/recalculate",
  authenticate, authorize(...ALL_ADMIN), recalculateController,
);

// Item gaji manual (PAY-038): Finance, Owner, Super Admin — hanya saat Draft
router.post("/:id/items",
  authenticate, authorize(...ALL_ADMIN), validateBody(createManualItemSchema), addManualItemController,
);
router.put("/:id/items/:itemId",
  authenticate, authorize(...ALL_ADMIN), validateBody(updateManualItemSchema), updateManualItemController,
);
router.delete("/:id/items/:itemId",
  authenticate, authorize(...ALL_ADMIN), deleteManualItemController,
);

router.post("/:id/submit",
  authenticate, authorize(...ALL_ADMIN), submitController,
);

// Kembalikan ke Draft (PENDING_APPROVAL → DRAFT): siapa pun yang boleh mengajukan
router.post("/:id/revert-draft",
  authenticate, authorize(...ALL_ADMIN), revertToDraftController,
);

router.post("/:id/approve",
  authenticate, authorize(...APPROVERS), approveController,
);

router.post("/:id/mark-paid",
  authenticate, authorize(...APPROVERS), markAsPaidController,
);

// Coba lagi kirim jurnal payroll PAID ke Accurate (job sync gagal)
router.post("/:id/sync-retry",
  authenticate, authorize(...ALL_ADMIN), retrySyncController,
);

router.patch("/:id/notes",
  authenticate, authorize(...ALL_ADMIN), validate(updateNotesSchema), updateNotesController,
);

router.delete("/:id",
  authenticate, authorize(...APPROVERS), deleteController,
);

module.exports = router;
