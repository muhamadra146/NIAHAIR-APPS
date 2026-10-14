const { Router }       = require("express");
const authenticate      = require("../../middlewares/auth.middleware");
const requireApprover = require("../../middlewares/approver.middleware");
const validate          = require("../../middlewares/validate.middleware");
const uploadSickLeave   = require("../../middlewares/uploadSickLeave.middleware");
const { createSickLeaveSchema, reviewSickLeaveSchema } = require("./sickLeave.validation");
const {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
  uploadDocumentController,
} = require("./sickLeave.controller");

const router = Router();


router.get("/",    authenticate, requireApprover, getAllController);
router.get("/my",  authenticate, getMyController);
router.get("/:id", authenticate, getByIdController);

router.post("/",   authenticate, validate(createSickLeaveSchema), createController);

router.post("/:id/document", authenticate, uploadSickLeave.single("document"), uploadDocumentController);

router.post("/:id/approve", authenticate, requireApprover, validate(reviewSickLeaveSchema), approveController);
router.post("/:id/reject",  authenticate, requireApprover, validate(reviewSickLeaveSchema), rejectController);

router.delete("/:id", authenticate, cancelController);

module.exports = router;
