const { Router }   = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const requireApprover = require("../../middlewares/approver.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { bulkScheduleSchema } = require("./staffSchedule.validation");
const {
  getRosterController,
  bulkUpsertController,
  getAvailableStaffController,
  getMySchedulesController,
} = require("./staffSchedule.controller");

const router = Router();

// Fixed paths must come before parameterised routes
router.get("/available", authenticate, getAvailableStaffController);
router.get("/roster",    authenticate, getRosterController);
router.get("/my",        authenticate, getMySchedulesController);

router.post(
  "/bulk",
  authenticate,
  requireApprover, // manager divisi / Owner / SA — batas staf dicek di service
  validate(bulkScheduleSchema),
  bulkUpsertController,
);

module.exports = router;
