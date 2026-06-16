const { Router }       = require("express");
const authenticate      = require("../../middlewares/auth.middleware");
const authorize         = require("../../middlewares/role.middleware");
const validate          = require("../../middlewares/validate.middleware");
const uploadSickLeave   = require("../../middlewares/uploadSickLeave.middleware");
const { ROLES }        = require("../../common/constants/role.constant");
const { createSickLeaveSchema, reviewSickLeaveSchema } = require("./sickLeave.validation");
const {
  getAllController, getMyController, getByIdController,
  createController, approveController, rejectController, cancelController,
  uploadDocumentController,
} = require("./sickLeave.controller");

const router = Router();

const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

router.get("/",    authenticate, authorize(...MANAGER_ROLES), getAllController);
router.get("/my",  authenticate, getMyController);
router.get("/:id", authenticate, getByIdController);

router.post("/",   authenticate, validate(createSickLeaveSchema), createController);

router.post("/:id/document", authenticate, uploadSickLeave.single("document"), uploadDocumentController);

router.post("/:id/approve", authenticate, authorize(...MANAGER_ROLES), validate(reviewSickLeaveSchema), approveController);
router.post("/:id/reject",  authenticate, authorize(...MANAGER_ROLES), validate(reviewSickLeaveSchema), rejectController);

router.delete("/:id", authenticate, cancelController);

module.exports = router;
