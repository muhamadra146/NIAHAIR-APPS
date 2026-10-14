const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const requireApprover = require("../../middlewares/approver.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { createCorrectionSchema, reviewCorrectionSchema } = require("./correction.validation");
const { getAllController, getMyController, getByIdController, createController, reviewController } =
  require("./correction.controller");

const router = Router();

router.get("/my",        authenticate, getMyController);
router.get("/",          authenticate, requireApprover, getAllController);
router.get("/:id",       authenticate, getByIdController);
router.post("/",            authenticate, validate(createCorrectionSchema), createController);
router.patch("/:id/review", authenticate, requireApprover, validate(reviewCorrectionSchema), reviewController);

module.exports = router;
